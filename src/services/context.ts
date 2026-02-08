

export type ActionContext = {
    orgId: string;
    userId: string;
};

/**
 * Enforces that an organization ID is present.
 * In a real app, this would validate the session and user permissions.
 * For now, it trusts the caller or middleware to provide correct IDs.
 */
export function assertOrgContext(context: ActionContext) {
    if (!context.orgId) {
        throw new Error('Organization Context Missing');
    }
}

/**
 * Higher-order helper to wrap service calls with context validation
 */
export function withOrgContext<T>(
    context: ActionContext,
    action: () => Promise<T>
): Promise<T> {
    assertOrgContext(context);
    return action();
}
