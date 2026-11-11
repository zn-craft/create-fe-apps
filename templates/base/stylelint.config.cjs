// 这个配置常驻在仓库里，接入 CSS / Less / Scss 后由 lint-staged 自动调用。
// 用 .cjs 是因为文件里是 module.exports，在 "type": "module" 的项目中
// 只有 .cjs 才会被当成 CommonJS 解析。
module.exports = {
  // 用社区标准规则作为底座，需要额外规则时在这里叠加。
  extends: ["stylelint-config-standard"],
  rules: {
    // 组件库常见的 BEM、工具类命名会被这条规则误伤，关掉。
    "selector-class-pattern": null,
    // 组件库里大量使用 :is() / :where() 和组合选择器，这条规则误报频繁，关掉。
    "no-descending-specificity": null
  }
};
