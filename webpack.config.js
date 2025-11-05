const devCerts = require("office-addin-dev-certs");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const path = require("path");

async function getHttpsOptions() {
  const httpsOptions = await devCerts.getHttpsServerOptions();
  return httpsOptions;
}

module.exports = async (env, argv) => {
  const isDev = argv.mode === "development";
  const httpsOptions = await getHttpsOptions();

  return {
    entry: "./taskpane.html",
    output: {
      clean: true,
      path: path.resolve(__dirname, "dist"),
      filename: "bundle.js",
    },
    plugins: [
      new HtmlWebpackPlugin({ template: "./taskpane.html" }),
      new CopyWebpackPlugin({
        patterns: [
          { from: "assets", to: "assets" },
          { from: "manifest*.xml", to: "[name][ext]" },
          {
            from: path.resolve(__dirname, "ui/dist/fusion-angular-tailwind-starter"),
            to: "ui/dist/fusion-angular-tailwind-starter",
          },
        ],
      }),
    ],
    devServer: {
      port: 3000,
      static: [
        path.resolve(__dirname, "./dist"),
        path.resolve(__dirname, "./"),
        path.resolve(__dirname, "ui/dist"),
      ],
      headers: { "Access-Control-Allow-Origin": "*" },
      server: { type: "https", options: httpsOptions },
      hot: true,
    },
    module: {
      rules: [
        { test: /\.html$/, use: "html-loader" },
        { test: /\.(png|jpg|jpeg|gif|ico)$/, type: "asset/resource" },
      ],
    },
    resolve: { extensions: [".js", ".html"] },
  };
};

