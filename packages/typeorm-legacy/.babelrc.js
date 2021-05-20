// We aim to have the same support as Next.js
// https://nextjs.org/docs/getting-started#system-requirements
// https://nextjs.org/docs/basic-features/supported-browsers-features

module.exports = {
  presets: [["@babel/preset-env", { targets: { node: "10.13" } }]],
  plugins: ["@babel/plugin-transform-runtime"],
  comments: false,
}
