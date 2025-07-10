# Hopper Plugin

*Because nobody likes awkward line crashes.*

> Adds an arc to allow representation of a 'raised intersection' where two straight vectors intersect (for now). Credit to Ian Latchmansingh for [wishing this into existence](https://medium.com/@usonesinbetween/the-user-experience-circuit-8c373ea957b2).

⚜️

## Known issues:

When used on actual LINE objects (not vector segments drawn with the pen tool) the arc ends up in a weird spot.

## Speculative roadmap:

- FigJam, 
- multi-segment lines, accept multi-line input?

BELOW THIS LINE everything is straight from Figma plugin instructions (easier to just install from [community page for the plugin](https://www.figma.com/community/plugin/1525183859635541717/hopper) ... but if you want to develop this further, please have at it.

---

Below are the steps to get your plugin running. You can also find instructions at:

  https://www.figma.com/plugin-docs/plugin-quickstart-guide/

This plugin template uses Typescript and NPM, two standard tools in creating JavaScript applications.

First, download Node.js which comes with NPM. This will allow you to install TypeScript and other
libraries. You can find the download link here:

  https://nodejs.org/en/download/

Next, install TypeScript using the command:

  npm install -g typescript

Finally, in the directory of your plugin, get the latest type definitions for the plugin API by running:

  npm install --save-dev @figma/plugin-typings

If you are familiar with JavaScript, TypeScript will look very familiar. In fact, valid JavaScript code
is already valid Typescript code.

TypeScript adds type annotations to variables. This allows code editors such as Visual Studio Code
to provide information about the Figma API while you are writing code, as well as help catch bugs
you previously didn't notice.

For more information, visit https://www.typescriptlang.org/

Using TypeScript requires a compiler to convert TypeScript (code.ts) into JavaScript (code.js)
for the browser to run.

We recommend writing TypeScript code using Visual Studio code:

1. Download Visual Studio Code if you haven't already: https://code.visualstudio.com/.
2. Open this directory in Visual Studio Code.
3. Compile TypeScript to JavaScript: Run the "Terminal > Run Build Task..." menu item,
    then select "npm: watch". You will have to do this again every time
    you reopen Visual Studio Code.

That's it! Visual Studio Code will regenerate the JavaScript file every time you save.
