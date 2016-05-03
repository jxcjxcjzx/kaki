#!/usr/bin/env node

var program = require('commander');
var chalk = require('chalk');
var fs = require('./../lib/fs-improved');
var types = require('./../lib/types');
var filters = require('./../lib/filters');
var defaultConfig = require('./../lib/default-config');
var util = require('./../lib/util');

var timeStart = 0;
var typeList = types.getAll();
var selectedTypes = [];
var path = process.cwd();

/**
 * configure input options
 */
function initialize() {

    program
        .version('1.0.5')
        .option('-i, --ignorecase', 'Ignore case distinctions')
        .option('-t, --extension <items>', 'Filter by custom types ex: ".app,.jar,.exe"')
        .option('-R, --rec', 'Search recursively')
        .option('-v, --invert', 'Invert match: select non-matching lines')
        .option('-w, --word [word]', 'Force PATTERN to match only whole words / regex')
        .option('-Q, --literal  [literal]', 'Quote all metacharacters')
        .option('--ignore <items>', 'ignore directories');


    //dynamic generate options
    for (var type in typeList) {
        program.option('--' + type, 'filter ' + type + ' files');
    }

    program.parse(process.argv);
    checkParams();
}

/**
 * check passed params and populate selectedType
 */
function checkParams() {

    timeStart = Date.now();
    filters.configure(program.ignorecase, program.invert);

    //verify if path exists
    if (program.args[0]) {
        fs.access(program.args[0], function (err) {
            if (err) {
                console.log(chalk.red('\nERROR: path not found.\n'));
                process.exit();
            }
        });
    }

    if (program.ignore) {
        defaultConfig.setIgnoreList(program.ignore.split(','));
    }

    //if extension param exists
    if (program.extension) {
        program.extension.split(",").forEach(function (el) {
            selectedTypes.push(el);
        });
    }

    //veify dynamic type params
    for (var type in typeList) {
        if (program[type]) {
            types.get(type).forEach(function (el) {
                selectedTypes.push(el);
            });
        }
    }

    path = program.args[0] || path;
    // go recursively or not
    if (program.rec) {
        fs.readdirRec(path, applyFilters);
    } else {
        fs.readdir(path, applyFilters);
    }
}

/**
 * filter files based on input params
 * @param err
 * @param {Array <string>} files
 */
function applyFilters(err, files) {
    var processFilesQty = files.length;

    function runFilters(files) {
        files = filters.validExtensions(files, selectedTypes);

        // quote all metacharacters
        if (program.literal) {
            files = filters.literalMatch(files, program.literal);
        }

        //return whole word or regex match
        if (program.word) {
            files = filters.wordRegexMatch(files, program.word);
        }

        processResult(files);
    }

    function processResult(response) {
        var timeEnd = Date.now() - timeStart;

        util.print(response.join('\n'))('white');
        if (!files.length) {
            util.print('-- srry, no files were found --\n')('yellow');
        } else {
            util.print('%s matches', response.length)('green');
        }
        util.print('%s searched files in %s ms', processFilesQty, timeEnd)('gray');
    }


    try {
        if (err) throw err;
        runFilters(files);
    } catch (ex) {
        util.print('\nERROR: oopps something is wrong..\n')('red');
    } finally {
        process.exit();
    }
}

initialize();
