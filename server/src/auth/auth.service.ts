import { Injectable, UnauthorizedException, ForbiddenException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MailQueueService } from '../queue/mail-queue.service';
import { RedisService } from '../redis/redis.service';
import { RedisKeys } from '../redis/redis.constants';
import { EmailTemplateService } from '../email/email-template.service';
import type { User } from '@prisma/client';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);
    private passwordHistoryTableReady = false;

    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
        private config: ConfigService,
        private mailQueue: MailQueueService,
        private redis: RedisService,
        private emailTemplates: EmailTemplateService,
    ) { }

    private parseDurationToMs(value: string): number {
        const match = String(value).trim().match(/^(\d+)([smhd])$/i);
        if (!match) {
            throw new BadRequestException(`Invalid duration value: ${value}`);
        }

        const amount = Number(match[1]);
        const unit = match[2].toLowerCase();
        const factor =
            unit === 's'
                ? 1000
                : unit === 'm'
                    ? 60_000
                    : unit === 'h'
                        ? 3_600_000
                        : 86_400_000;

        return amount * factor;
    }

    private getAccessTokenTtl(): string {
        return this.config.get<string>('JWT_ACCESS_EXPIRES_IN') || '15m';
    }

    private getRefreshTokenTtl(): string {
        return this.config.get<string>('JWT_REFRESH_EXPIRES_IN') || '60m';
    }

    private getRefreshTokenSecret(): string {
        return this.config.get<string>('JWT_REFRESH_SECRET') || 'buildos_refresh_secret_change_in_production';
    }

    private getJwtSecret(): string {
        return this.config.get<string>('JWT_SECRET') || 'buildos_jwt_secret_change_in_production';
    }

    private getRevocationTtlSeconds(): number {
        try {
            return Math.ceil(this.parseDurationToMs(this.getRefreshTokenTtl()) / 1000);
        } catch {
            return 3600;
        }
    }

    /**
     * Mark every access token issued to a user before "now" as revoked. Backed by
     * Redis and enforced by the auth guard; a no-op when Redis is not configured.
     */
    private async setRevocation(userId: string): Promise<void> {
        if (!this.redis.isEnabled) return;
        const nowSeconds = Math.floor(Date.now() / 1000);
        await this.redis.setRaw(
            RedisKeys.userRevokedAt(userId),
            String(nowSeconds),
            this.getRevocationTtlSeconds(),
        );
    }

    /** Clear any standing revocation marker so a freshly issued session is valid. */
    private async clearRevocation(userId: string): Promise<void> {
        if (!this.redis.isEnabled) return;
        await this.redis.del(RedisKeys.userRevokedAt(userId));
    }

    private isValidEmail(email: string): boolean {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    private assertStrongPassword(password: string): void {
        const value = String(password ?? '');
        const hasMinLength = value.length >= 8;
        const hasLetter = /[A-Za-z]/.test(value);
        const hasNumber = /[0-9]/.test(value);
        const hasSymbol = /[^A-Za-z0-9]/.test(value);
        if (!hasMinLength || !hasLetter || !hasNumber || !hasSymbol) {
            throw new BadRequestException(
                'Password must be at least 8 characters and include letters, numbers, and symbols.',
            );
        }
    }

    private escapeHtml(value: string): string {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    private normalizeBaseUrl(value: string): string {
        return String(value || '').trim().replace(/\/$/, '');
    }

    private getFrontendBaseUrl(): string {
        const explicitUrl = this.config.get<string>('FRONTEND_URL')
            || this.config.get<string>('APP_WEB_URL');

        if (explicitUrl) {
            return this.normalizeBaseUrl(explicitUrl);
        }

        const legacyWebUrl = this.config.get<string>('WEB_URL');
        if (legacyWebUrl) {
            const normalizedLegacy = this.normalizeBaseUrl(legacyWebUrl);
            this.logger.warn(
                `FRONTEND_URL is not set. Falling back to WEB_URL for reset links: ${normalizedLegacy}`,
            );
            return normalizedLegacy;
        }

        const fallback = this.config.get<string>('NODE_ENV') === 'production'
            ? 'https://build-os-delta.vercel.app'
            : 'http://localhost:5173';

        this.logger.warn(
            `FRONTEND_URL is not configured. Using fallback URL for reset links: ${fallback}`,
        );

        return fallback;
    }

    private async sendPasswordResetEmail(email: string, name: string, resetLink: string): Promise<void> {
        const safeName = String(name || '').trim() || 'there';

        // Admin-configured template ("Password Reset Requested") takes
        // precedence over the built-in reset email.
        const templated = await this.emailTemplates.compose('Password Reset Requested', {
            name: safeName,
            user_name: safeName,
            email,
            user_email: email,
            reset_link: resetLink,
        });
        if (templated) {
            // Only add the built-in button when the template does not provide a
            // link of its own — write `[[Reset Password]]({{reset_link}})` in the
            // body to control its label and placement.
            const fallbackButton = templated.hasLink
                ? ''
                : `<p style="margin:16px 0 0;font-family:Segoe UI,Arial,sans-serif;">` +
                  `<a href="${this.escapeHtml(resetLink)}" style="display:inline-block;` +
                  `padding:12px 20px;border-radius:10px;background:#2563eb;color:#ffffff;` +
                  `text-decoration:none;font-weight:600;font-size:14px;">Reset Password</a></p>`;
            await this.mailQueue.enqueueEmail({
                to: email,
                subject: templated.subject || 'Reset your BuildOS password',
                text: templated.hasLink
                    ? templated.text
                    : `${templated.text}\n\nReset your password: ${resetLink}`,
                html: `${templated.html}${fallbackButton}`,
                ...(templated.cc.length > 0 ? { cc: templated.cc } : {}),
            });
            return;
        }

        const escapedName = this.escapeHtml(safeName);
        const escapedResetLink = this.escapeHtml(resetLink);

        await this.mailQueue.enqueueEmail({
            to: email,
            subject: 'Reset your BuildOS password',
            text: `Hi ${safeName},\n\nUse this link to reset your BuildOS password: ${resetLink}\n\nThis link expires in 30 minutes. If you did not request this, you can ignore this email.`,
            html: `
                                <div style="margin:0; padding:24px; background:#f3f6fb; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif; color:#0f172a;">
                                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px; margin:0 auto; background:#ffffff; border:1px solid #e2e8f0; border-radius:16px; overflow:hidden;">
                                        <tr>
                                            <td style="padding:24px 28px; background:linear-gradient(120deg, #1d4ed8, #2563eb); color:#ffffff;">
                                                <h1 style="margin:0; font-size:22px; line-height:1.2; font-weight:700;">BuildOS</h1>
                                                <p style="margin:8px 0 0; font-size:14px; opacity:.92;">Password reset request</p>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style="padding:28px;">
                                                <p style="margin:0 0 14px; font-size:15px;">Hi ${escapedName},</p>
                                                <p style="margin:0 0 18px; font-size:15px; line-height:1.6; color:#334155;">
                                                    We received a request to reset your BuildOS password. Click the button below to choose a new password.
                                                </p>
                                                <p style="margin:0 0 24px;">
                                                    <a href="${escapedResetLink}" style="display:inline-block; padding:12px 20px; border-radius:10px; background:#2563eb; color:#ffffff; text-decoration:none; font-weight:600; font-size:14px;">Reset Password</a>
                                                </p>
                                                <p style="margin:0 0 8px; font-size:13px; color:#64748b; line-height:1.6;">
                                                    This link expires in <strong>30 minutes</strong>. If the button does not work, copy and paste this URL into your browser:
                                                </p>
                                                <p style="margin:0 0 18px; font-size:12px; word-break:break-all; color:#2563eb;">${escapedResetLink}</p>
                                                <p style="margin:0; font-size:13px; color:#64748b; line-height:1.6;">
                                                    If you did not request this password reset, you can safely ignore this email.
                                                </p>
                                            </td>
                                        </tr>
                                    </table>
                                </div>
            `,
        });

        this.logger.log(`Password reset email queued for delivery to ${email}`);
    }

    private getPrivilegedAdminEmail(): string {
        return (this.config.get<string>('SEED_ADMIN_EMAIL') || 'admin@buildos.ng').trim().toLowerCase();
    }

    private getAllApps(): string[] {
        return ['construction', 'finance', 'hr', 'procurement', 'admin', 'ess', 'storefront'];
    }

    private async ensurePrivilegedAdminAccount(user: User) {
        const privilegedEmail = this.getPrivilegedAdminEmail();
        if (user.email.trim().toLowerCase() !== privilegedEmail) {
            return user;
        }

        const allApps = this.getAllApps();
        const hasAllApps = allApps.every((app) => Array.isArray(user.assignedApps) && user.assignedApps.includes(app));
        const isAdmin = String(user.role || '').trim().toLowerCase() === 'admin';

        if (isAdmin && hasAllApps) {
            return user;
        }

        const updated = await this.prisma.user.update({
            where: { id: user.id },
            data: {
                role: 'admin',
                assignedApps: allApps,
            },
        });

        return updated;
    }

    private async ensurePasswordHistoryTable() {
        if (this.passwordHistoryTableReady) return;

        await this.prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS user_password_history (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
                password_hash TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `);
        await this.prisma.$executeRawUnsafe(`
            CREATE INDEX IF NOT EXISTS idx_user_password_history_user_id_created_at
            ON user_password_history (user_id, created_at DESC)
        `);

        this.passwordHistoryTableReady = true;
    }

    private async getRecentPasswordHashes(userId: string, limit = 3): Promise<string[]> {
        await this.ensurePasswordHistoryTable();

        const rows = await this.prisma.$queryRawUnsafe<Array<{ password_hash: string }>>(
            `
            SELECT password_hash
            FROM user_password_history
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT $2
            `,
            userId,
            limit,
        );

        return rows.map((row) => row.password_hash);
    }

    private async addPasswordHistoryEntry(userId: string, passwordHash: string) {
        await this.ensurePasswordHistoryTable();

        await this.prisma.$executeRawUnsafe(
            `
            INSERT INTO user_password_history (id, user_id, password_hash)
            VALUES ($1, $2, $3)
            `,
            crypto.randomUUID(),
            userId,
            passwordHash,
        );

        await this.prisma.$executeRawUnsafe(
            `
            DELETE FROM user_password_history
            WHERE user_id = $1
              AND id NOT IN (
                SELECT id
                FROM user_password_history
                WHERE user_id = $1
                ORDER BY created_at DESC
                LIMIT 3
              )
            `,
            userId,
        );
    }

    private async issueTokenPair(user: { id: string; email: string; role: string; assignedApps?: string[] }) {
        // Embed the user's assigned apps in the token so module-level access can be
        // enforced by the auth guard without an extra DB read per request. Resolve
        // from the database when the caller did not supply it (e.g. token refresh),
        // which also keeps refreshed tokens in sync with the latest app assignments.
        let assignedApps = Array.isArray(user.assignedApps) ? user.assignedApps : null;
        if (!assignedApps) {
            const dbUser = await this.prisma.user.findUnique({
                where: { id: user.id },
                select: { assignedApps: true },
            });
            assignedApps = dbUser?.assignedApps ?? [];
        }

        // ESS is every employee's baseline — it is where they raise their own
        // requests, so it is never something to be assigned or withheld. Without
        // this, a user whose record simply had no apps assigned yet was locked out
        // of ESS by the guard's app check. Mirrors PermissionsService.resolveForUser.
        assignedApps = Array.from(new Set(['ess', ...assignedApps]));

        const payload = { sub: user.id, email: user.email, role: user.role, assignedApps };
        const accessTtl = this.getAccessTokenTtl();
        const refreshTtl = this.getRefreshTokenTtl();

        const access_token = this.jwtService.sign(payload, {
            expiresIn: accessTtl,
        });

        const refresh_token = this.jwtService.sign(payload, {
            secret: this.getRefreshTokenSecret(),
            expiresIn: refreshTtl,
        });

        const refreshTokenHash = await bcrypt.hash(refresh_token, 10);
        const refreshTokenExpiresAt = new Date(Date.now() + this.parseDurationToMs(refreshTtl));

        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                refreshTokenHash,
                refreshTokenExpiresAt,
            },
        });

        await this.clearRevocation(user.id);

        return {
            access_token,
            refresh_token,
            access_expires_in: accessTtl,
            refresh_expires_in: refreshTtl,
        };
    }

    /**
     * Build the public user payload returned on auth responses. Includes the
     * linked `employeeId` (resolved by email) so the frontend can submit
     * employee-scoped records (leave, claims, expenses) without an extra call.
     */
    private async buildUserResponse(user: {
        id: string;
        email: string;
        name: string;
        role: string;
        assignedApps: string[];
    }) {
        // Prefer the explicit Employee↔User link; fall back to matching on email
        // for employees onboarded before that link existed. Resolving by link
        // keeps working if an admin later changes the login email.
        const employee = await this.prisma.employee
            .findFirst({
                where: { OR: [{ userId: user.id }, { email: user.email }] },
                select: { id: true },
            })
            .catch(() => null);
        return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            assignedApps: user.assignedApps,
            employeeId: employee?.id ?? null,
        };
    }

    async login(email: string, password: string) {
        const normalizedEmail = email.trim().toLowerCase();
        const foundUser = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
        const user = foundUser ? await this.ensurePrivilegedAdminAccount(foundUser) : null;
        if (!user) throw new UnauthorizedException('Invalid credentials');

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) throw new UnauthorizedException('Invalid credentials');

        // Block access for accounts that are not active. Use 403 (not 401) so the
        // client surfaces the specific reason instead of a generic auth failure.
        const normalizedStatus = String(user.status ?? '').trim().toLowerCase();
        if (normalizedStatus !== 'active') {
            const isPendingInvite = ['pending', 'pending_invite', 'invited', 'pending invite'].includes(
                normalizedStatus,
            );
            throw new ForbiddenException(
                isPendingInvite
                    ? 'Your account has not been activated yet. Please use your invitation email to set up your account.'
                    : 'Your account has been deactivated. Please reach out to your system administrator.',
            );
        }

        // Update lastLogin timestamp so "Last Active" reflects real activity
        await this.prisma.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date() },
        });

        const tokenPair = await this.issueTokenPair({ id: user.id, email: user.email, role: user.role });
        return {
            ...tokenPair,
            user: await this.buildUserResponse(user),
        };
    }

    async register(name: string, email: string, password: string) {
        const existing = await this.prisma.user.findUnique({ where: { email } });
        if (existing) throw new ConflictException('Email already in use');

        const hashed = await bcrypt.hash(password, 10);
        const user = await this.prisma.user.create({
            data: {
                name,
                email,
                password: hashed,
                role: 'admin',
                assignedApps: ['construction', 'finance', 'hr', 'procurement', 'admin', 'ess', 'storefront'],
            },
        });

        const tokenPair = await this.issueTokenPair({ id: user.id, email: user.email, role: user.role });
        return {
            ...tokenPair,
            user: await this.buildUserResponse(user),
        };
    }

    async verifyEmail(token: string) {
        // Accept any 6-digit numeric token; production would check a stored OTP
        if (!token || !/^\d{6}$/.test(token)) {
            throw new UnauthorizedException('Invalid verification code');
        }
        return { verified: true };
    }

    async getMe(userId: string) {
        const user = await this.prisma.user.findUniqueOrThrow({
            where: { id: userId },
            select: { id: true, name: true, email: true, role: true, department: true, phone: true, signature: true },
        });
        const employee = await this.prisma.employee.findUnique({
            where: { email: user.email },
            include: { department: true },
        });
        return { user, employee };
    }

    async updateProfile(userId: string, data: { phone?: string | null; signature?: string | null }) {
        const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

        const userData: { phone?: string | null; signature?: string | null } = {};
        if (data.phone !== undefined) userData.phone = data.phone;
        if (data.signature !== undefined) userData.signature = data.signature;

        if (Object.keys(userData).length > 0) {
            await this.prisma.user.update({ where: { id: userId }, data: userData });
        }

        // Keep the employee record's phone in sync when provided.
        if (data.phone !== undefined) {
            const employee = await this.prisma.employee.findUnique({ where: { email: user.email } });
            if (employee && data.phone) {
                await this.prisma.employee.update({ where: { id: employee.id }, data: { phone: data.phone } });
            }
        }

        return this.getMe(userId);
    }

    async activateInvite(token: string, password: string) {
        if (!token) throw new BadRequestException('Invite token is required');
        this.assertStrongPassword(password);

        const user = await this.prisma.user.findFirst({ where: { inviteToken: token } });
        if (!user) throw new BadRequestException('Invalid or expired invite token');
        if (user.inviteExpiresAt && user.inviteExpiresAt < new Date()) {
            throw new BadRequestException('Invite token has expired');
        }

        const hashed = await bcrypt.hash(password, 10);
        const updated = await this.prisma.user.update({
            where: { id: user.id },
            data: { password: hashed, status: 'Active', inviteToken: null, inviteExpiresAt: null },
        });

        const tokenPair = await this.issueTokenPair({ id: updated.id, email: updated.email, role: updated.role });
        return {
            ...tokenPair,
            user: await this.buildUserResponse(updated),
        };
    }

    async refresh(refreshToken: string) {
        if (!refreshToken) {
            throw new UnauthorizedException('Refresh token is required');
        }

        let payload: { sub: string; email: string; role: string };
        try {
            payload = this.jwtService.verify<{ sub: string; email: string; role: string }>(refreshToken, {
                secret: this.getRefreshTokenSecret(),
            });
        } catch {
            throw new UnauthorizedException('Invalid or expired refresh token');
        }

        const foundUser = await this.prisma.user.findUnique({ where: { id: payload.sub } });
        const user = foundUser ? await this.ensurePrivilegedAdminAccount(foundUser) : null;
        if (!user || !user.refreshTokenHash || !user.refreshTokenExpiresAt) {
            throw new UnauthorizedException('Refresh token is not recognized');
        }

        if (user.refreshTokenExpiresAt.getTime() < Date.now()) {
            await this.clearRefreshToken(user.id);
            throw new UnauthorizedException('Refresh token has expired');
        }

        const tokenMatches = await bcrypt.compare(refreshToken, user.refreshTokenHash);
        if (!tokenMatches) {
            throw new UnauthorizedException('Refresh token does not match');
        }

        const tokenPair = await this.issueTokenPair({ id: user.id, email: user.email, role: user.role });
        return {
            ...tokenPair,
            user: await this.buildUserResponse(user),
        };
    }

    async clearRefreshToken(userId: string) {
        await this.prisma.user.update({
            where: { id: userId },
            data: {
                refreshTokenHash: null,
                refreshTokenExpiresAt: null,
            },
        });

        // Revoke outstanding access tokens for this user (logout / forced sign-out).
        await this.setRevocation(userId);
    }

    async forgotPassword(email: string) {
        const normalizedEmail = email.trim().toLowerCase();
        if (!normalizedEmail) {
            throw new BadRequestException('Email is required');
        }
        if (!this.isValidEmail(normalizedEmail)) {
            throw new BadRequestException('Please enter a valid email address');
        }

        // Do not reveal whether email exists to prevent account enumeration.
        const user = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
        if (!user) {
            return { success: true, message: 'If an account with this email exists, a password reset link will be sent' };
        }

        const resetToken = this.jwtService.sign(
            { sub: user.id, email: user.email, type: 'password-reset' },
            { secret: this.getJwtSecret(), expiresIn: '30m' },
        );
        const resetLink = `${this.getFrontendBaseUrl()}/auth/reset-password?token=${encodeURIComponent(resetToken)}`;

        await this.sendPasswordResetEmail(user.email, user.name, resetLink);
        return { success: true, message: 'If an account with this email exists, a password reset link will be sent' };
    }

    async resetPassword(token: string, password: string) {
        if (!token) {
            throw new BadRequestException('Reset token is required');
        }
        this.assertStrongPassword(password);

        let payload: { sub: string; email: string; type?: string };
        try {
            payload = this.jwtService.verify<{ sub: string; email: string; type?: string }>(token, {
                secret: this.getJwtSecret(),
            });
        } catch {
            throw new UnauthorizedException('Invalid or expired reset token');
        }

        if (payload.type !== 'password-reset' || !payload.sub || !payload.email) {
            throw new UnauthorizedException('Invalid reset token');
        }

        const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
        if (!user || user.email.trim().toLowerCase() !== payload.email.trim().toLowerCase()) {
            throw new UnauthorizedException('Invalid reset token');
        }

        const isCurrentPassword = await bcrypt.compare(password, user.password);
        if (isCurrentPassword) {
            throw new BadRequestException('You cannot reuse your current password');
        }

        const recentPasswordHashes = await this.getRecentPasswordHashes(user.id, 3);
        for (const previousHash of recentPasswordHashes) {
            const isReused = await bcrypt.compare(password, previousHash);
            if (isReused) {
                throw new BadRequestException('You cannot reuse any of your last 3 passwords');
            }
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                refreshTokenHash: null,
                refreshTokenExpiresAt: null,
            },
        });

        await this.addPasswordHistoryEntry(user.id, user.password);

        // Invalidate every existing session after a password reset.
        await this.setRevocation(user.id);

        return { success: true, message: 'Password has been reset successfully' };
    }
}