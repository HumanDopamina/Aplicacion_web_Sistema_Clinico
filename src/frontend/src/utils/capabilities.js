export const hasCapability = (user, capability) => (
  Boolean(user?.permissions?.includes(capability))
)

export const hasAnyCapability = (user, capabilities) => (
  capabilities.some((capability) => hasCapability(user, capability))
)
