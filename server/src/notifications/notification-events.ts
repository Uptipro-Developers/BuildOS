/**
 * The events a notification rule can be attached to.
 *
 * Admin › Notifications used to accept any free text as the event, which meant
 * no rule could ever match anything the system actually emits. A rule now names
 * one of these, and each is dispatched from the code path that performs it.
 */
export interface NotificationEventDef {
    /** Stable key stored on the rule. */
    key: string;
    label: string;
    app: string;
    description: string;
}

export const NOTIFICATION_EVENTS: NotificationEventDef[] = [
    {
        key: 'expense.submitted',
        label: 'Expense submitted',
        app: 'finance',
        description: 'An expense has been submitted for approval.',
    },
    {
        key: 'expense.approved',
        label: 'Expense approved',
        app: 'finance',
        description: 'An expense has been approved.',
    },
    {
        key: 'expense.rejected',
        label: 'Expense rejected',
        app: 'finance',
        description: 'An expense has been rejected.',
    },
    {
        key: 'leave-request.submitted',
        label: 'Leave request submitted',
        app: 'hr',
        description: 'An employee has requested leave.',
    },
    {
        key: 'leave-request.decided',
        label: 'Leave request approved or rejected',
        app: 'hr',
        description: 'A leave request has been approved or rejected.',
    },
    {
        key: 'purchase-request.created',
        label: 'Purchase request raised',
        app: 'procurement',
        description: 'A purchase request has been raised.',
    },
    {
        key: 'rfq.sent',
        label: 'RFQ sent',
        app: 'procurement',
        description: 'A request for quotation has been sent to suppliers.',
    },
    {
        key: 'purchase-order.created',
        label: 'Purchase order created',
        app: 'procurement',
        description: 'A purchase order has been created.',
    },
];

export const NOTIFICATION_EVENT_KEYS = NOTIFICATION_EVENTS.map((e) => e.key);

/** Recipient groups a rule can address, besides an explicit email list. */
export const NOTIFICATION_RECIPIENT_GROUPS = [
    'All Users',
    'Administrators',
    'The requester',
] as const;
