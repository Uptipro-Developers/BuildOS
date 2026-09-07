declare module 'feedback-widget.es.js' {
    export interface FeedbackWidgetUserInfo {
        email?: string;
        name?: string;
    }

    export interface FeedbackWidgetProps {
        /** Your application's ID, from the admin dashboard's App Management screen */
        appId: string;
        /** Your application's API key, from the admin dashboard's App Management screen */
        apiKey: string;
        /** Overrides the default feedback server URL (defaults to the hosted Railway instance) */
        apiBaseUrl?: string;
        /** Pre-fills the email/name fields shown in the feedback form, if provided */
        userInfo?: FeedbackWidgetUserInfo;
    }

    export function FeedbackWidget(props: FeedbackWidgetProps): JSX.Element;
}