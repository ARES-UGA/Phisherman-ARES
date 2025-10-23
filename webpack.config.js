const devCerts = require("office-addin-dev-certs");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const path = require("path");

async function getHttpsOptions() {
  const httpsOptions = await devCerts.getHttpsServerOptions();
  return { ca: httpsOptions.ca, key: httpsOptions.key, cert: httpsOptions.cert };
}

module.exports = async (env, argv) => {
  const dev = argv.mode === "development";
  const httpsOptions = await getHttpsOptions();

  return {
    entry: "./taskpane.html", // just bundle your HTML, not Angular
    output: { clean: true },
    plugins: [
      new HtmlWebpackPlugin({ template: "./taskpane.html" }),
      new CopyWebpackPlugin({
        patterns: [
          { from: "assets", to: "assets" },
          { from: "manifest*.xml", to: "[name][ext]" },
        ],
      }),
    ],
    devServer: {
      port: 3000,
      static: ["."],
      headers: { "Access-Control-Allow-Origin": "*" },
      server: {
        type: "https",
        options: httpsOptions,
      },
      hot: true,
    },
    resolve: { extensions: [".js", ".html"] },
    module: {
      rules: [
        { test: /\.html$/, use: "html-loader" },
        { test: /\.(png|jpg|jpeg|gif|ico)$/, type: "asset/resource" },
      ],
    },
  };
};

