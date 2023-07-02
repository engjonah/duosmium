const { EleventyServerless } = require("@11ty/eleventy");

// Explicit dependencies for the bundler from config file and global data.
// The file is generated by the Eleventy Serverless Bundler Plugin.
require("./eleventy-bundler-modules.js");

async function handler(event) {
  let data = {};
  if (
    ["/preview/render/", "/preview/validate/", "/preview/meta/"].includes(
      event.path
    )
  ) {
    if (event.httpMethod === "POST") {
      if (!event.body) {
        return {
          statusCode: 400,
          headers: {
            "Access-Control-Allow-Origin": "*",
          },
          body: "Missing body",
        };
      }
      try {
        const parsed = JSON.parse(event.body);
        if (!parsed.rep) {
          return {
            statusCode: 400,
            headers: {
              "Access-Control-Allow-Origin": "*",
            },
            body: "Needs a rep key",
          };
        }
        data.rep = parsed.rep;
        data.superscore = parsed.superscore ?? false;
      } catch {
        return {
          statusCode: 400,
          headers: {
            "Access-Control-Allow-Origin": "*",
          },
          body: "Invalid JSON",
        };
      }
    } else if (event.httpMethod === "GET") {
      if (event.queryStringParameters.from) {
        data.from = event.queryStringParameters.from;
        data.superscore = event.queryStringParameters.superscore ?? false;
      } else {
        return {
          statusCode: 400,
          headers: {
            "Access-Control-Allow-Origin": "*",
          },
          body: "Missing 'from' query parameter",
        };
      }
    } else {
      return {
        statusCode: 405,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
        body: "Method not allowed",
      };
    }
  }

  let elev = new EleventyServerless("dynamicpost", {
    path: event.path,
    query: data,
    functionsDir: "./serverless/",
  });

  try {
    let [page] = await elev.getOutput();

    // If you want some of the data cascade available in `page.data`, use `eleventyConfig.dataFilterSelectors`.
    // Read more: https://www.11ty.dev/docs/config/#data-filter-selectors

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "text/html; charset=UTF-8",
        "Access-Control-Allow-Origin": "*",
      },
      body: page.content,
    };
  } catch (error) {
    // Only console log for matching serverless paths
    // (otherwise you’ll see a bunch of BrowserSync 404s for non-dynamic URLs during --serve)
    if (elev.isServerlessUrl(event.path)) {
      console.log("Serverless Error:", error);
    }

    return {
      statusCode: error.httpStatusCode || 500,
      body: "An error occurred. This could be due to an invalid input, or some other issue.",
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    };
  }
}

// Choose one:
// * Runs on each request: AWS Lambda (or Netlify Function)
// * Runs on first request only: Netlify On-demand Builder
//   (don’t forget to `npm install @netlify/functions`)

exports.handler = handler;

//const { builder } = require("@netlify/functions");
//exports.handler = builder(handler);
