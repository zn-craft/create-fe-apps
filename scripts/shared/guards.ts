// 两个脚本都要读外部 JSON，收窄逻辑放这里，避免各写一份。

/** 只接受普通对象：读入的 JSON 先收窄再往下传，别把 any 带进后续逻辑。 */
export const isPlainObject = (
  value: unknown,
): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
