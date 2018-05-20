#!/usr/bin/env node

'use strict';

const fs = require('fs'),
    program = require('commander');

program
    .option('-l, --logging', 'turn on logging')
    .option('-d, --demo', 'run demo mode (supplied file is ignored)')
    .option('-f, --file <file>', 'load participants file')
    .option('-g, --generate <file>', 'generate sample participants file')

program.parse(process.argv);

class Person {
    constructor(name, blackList) {
        this.name = name;
        if (Array.isArray(blackList)) {
            this.blackList = new Set(blackList);
        } else {
            this.blackList = new Set();
        }
    }

    addToBlackList(name) {
        this.blackList.add(name);
        return this.blackList;
    }

    hasNameInBlackList(name) {
        return this.blackList.has(name);
    }

    getBlackListArray() {
        return [...this.blackList.values()];
    }
}

class Persons {
    constructor() {
        this.people = new Map();
        this.gifters = new Map();
        this.giftees = new Set();
    }

    addPerson(name, blackList) {
        this.people.set(name, new Person(name, blackList));
        return true;
    }

    hasPerson(name) {
        return this.people.has(name);
    }

    getPerson(name) {
        return this.people.get(name);
    }

    getAllPeopleNames(doShuffle) {
        const array = [...this.people.keys()];
        if (doShuffle) {
            for (let idx = array.length - 1; idx > 0; idx--) {
                const rnd = Math.floor(Math.random() * (idx + 1));
                [array[idx], array[rnd]] = [array[rnd], array[idx]];
            }
        }
        return array;
    }

    hasNameInBlackList(name, blackListName) {
        if (!this.hasPerson(name)) {
            return false;
        }
        return this.getPerson(name).hasNameInBlackList(blackListName);
    }

    hasPersonAsGifter(name) {
        return this.people.has(name);
    }

    getGifteeOfPerson(name) {
        return this.gifters.get(name);
    }

    setGifteeOfPerson(gifter, giftee) {
        if (!this.hasPerson(gifter)) {
            return false;
        }
        this.gifters.set(gifter, giftee);
        this.giftees.add(giftee);
        return true;
    }

    hasGifteeForPerson(gifter, giftee) {
        if (!this.hasPersonAsGifter(gifter)) {
            return false;
        }
        return (this.getGifteeOfPerson(gifter) === giftee);
    }

    hasPersonAsGiftee(giftee) {
        return this.giftees.has(giftee);
    }

    getAllGiftersArray() {
        return [...this.gifters.keys()];
    }

    getAllGifters() {
        return this.gifters;
    }

    loadArray(data, errStdOutCb, errStdErrCb) {
        const cbErr = (typeof errStdErrCb === 'function')
                ? errStdErrCb
                : () => { /* Noop arrow func */ },
            cbOut = (typeof errStdOutCb === 'function')
                ? errStdOutCb
                : () => { /* Noop arrow func */ };

        let retval = false;

        if (!Array.isArray(data)) {
            cbOut('Invalid JSON loaded from file.');
            cbErr('Unexpected JSON: top level must be array.');
        }
        for (let idx = 0; idx < data.length; idx++) {
            const person = data[idx];
            if (!Array.isArray(person)) {
                cbOut('Invalid JSON loaded from file.');
                cbErr('Unexpected JSON: elements of top level must be arrays.');
                break;
            } else if (person.length !== 2) {
                cbOut('Invalid JSON loaded from file.');
                cbErr('Unexpected JSON: elements of top level must be arrays of length 2.');
                break;
            } else {
                const [personName, personBlackList] = person;
                if (!Array.isArray(personBlackList)) {
                    cbOut('Invalid JSON loaded from file.');
                    cbErr('Unexpected JSON: second level must be array.');
                    break;
                }
                if (!Array.isArray(personBlackList)) {
                    cbOut('Invalid JSON loaded from file.');
                    cbErr(`Unexpected JSON: elements of top level must be arrays of length 2;
the second index of these arrays must be an array.`);
                    break;
                }
                retval = this.addPerson(personName, personBlackList) || retval;
            }
        }
        return retval;
    }

    loadDataFromFile(filename, errStdOutCb, errStdErrCb) {
        const cbErr = (typeof errStdErrCb === 'function')
                ? errStdErrCb
                : () => { /* Noop arrow func */ },
            cbOut = (typeof errStdOutCb === 'function')
                ? errStdOutCb
                : () => { /* Noop arrow func */ };

        let arr = [],
            fileContents = '',
            success = true;

        try {
            fileContents = fs.readFileSync(filename, 'utf8');
        } catch (err) {
            cbOut(`Unable to open file: ${filename}`);
            cbErr(`${err.name}: ${err.message}`);
            success = false;
        }

        if (success) {
            try {
                arr = JSON.parse(fileContents);
            } catch (err) {
                cbOut('Unable to parse JSON.');
                cbErr(`${err.name}: ${err.message}`);
                success = false;
            }
        }

        if (success) {
            success = this.loadArray(arr);
        }
        return success;
    }

    saveDataToFile(filename, errStdOutCb, errStdErrCb) {
        const cbErr = (typeof errStdErrCb === 'function')
                ? errStdErrCb
                : () => { /* Noop arrow func */ },
            cbOut = (typeof errStdOutCb === 'function')
                ? errStdOutCb
                : () => { /* Noop arrow func */ },
            fileContentsArr = [];

        let fileContents = '',
            success = true;

        for (const [key, value] of this.people) {
            fileContentsArr.push([key, value.getBlackListArray()]);
        }

        try {
            fileContents = JSON.stringify(fileContentsArr, null, 2);
        } catch (err) {
            cbOut('Unable to generate JSON for save file.');
            cbErr(`${err.name}: ${err.message}`);
            success = false;
        }

        if (success) {
            try {
                fs.writeFileSync(filename, fileContents);
            } catch (err) {
                cbOut(`Unable to write file: ${filename}`);
                cbErr(`${err.name}: ${err.message}`);
                success = false;
            }
        }
        return success;
    }
}

class GiftExchange {
    constructor(isDemo, isLogging, dataFilePath, genFilePath) {
        this.people = new Persons();
        this.demoing = isDemo;
        this.logging = isLogging;
        this.dataFile = dataFilePath;
        this.genFile = genFilePath;
        this.generatorSuccess = false;

        const logCallback = this.logging
            ? console.error
            : () => { /* Noop arrow func */ };

        if (this.demoing) {
            this.people.loadArray(
                GiftExchange.generateSampleData(),
                console.log,
                logCallback
            );
        } else if ((typeof this.dataFile !== 'undefined') && (this.dataFile !== '')) {
            this.people.loadDataFromFile(
                this.dataFile,
                console.log,
                logCallback
            );
        }

        if ((typeof this.genFile !== 'undefined') && (this.genFile !== '')) {
            const tmpPeople = new Persons();
            tmpPeople.loadArray(
                GiftExchange.generateSampleData(),
                console.log,
                logCallback
            );
            if (tmpPeople.saveDataToFile(
                this.genFile,
                console.log,
                logCallback
            )) {
                console.log(`Sample participants file generated: ${this.genFile}`);
            }
        }

        const gifts = this.determineGifts(this.people.getAllPeopleNames(true));
        let isDone = false;

        do {
            const res = gifts.next();
            if (res.done) {
                isDone = true;
            } else {
                for (const [key, value] of res.value) {
                    console.log(`${key} = ${value}`);
                }
                this.generatorSuccess = true;
            }
        } while (!isDone);

        if (!this.generatorSuccess) {
            logCallback('No results.');
        }
    }

    get success() {
        return this.generatorSuccess;
    }

    static generateSampleData() {
        return [
            ['Matt', ['Allison', 'David']],
            ['David', ['Samantha', 'Carol']],
            ['Louis', ['Rhianna', 'Samantha']],
            ['Jerry', ['Carol', 'Allison']],
            ['Allison', ['Matt', 'Rhianna']],
            ['Samantha', ['David', 'Lynn']],
            ['Rhianna', ['Louis', 'Matt']],
            ['Carol', ['Jerry', 'Louis']],
            ['Lynn', ['Jerry']]
        ];
    }

    * determineGifts(names) {
        if ( (Array.isArray(names)) && (names.length > 0) &&
            (this.people instanceof Persons) ) {
            const [currentGifter, ...rest] = names,
                logCallback = this.logging
                    ? console.error
                    : () => { /* Noop arrow func */ };

            for (const potentialGiftee of names.concat(this.people.getAllGiftersArray())) {
                if (potentialGiftee === currentGifter) {
                    logCallback(`Potential giftee (${potentialGiftee}) is same as current gifter (${currentGifter}).`);
                } else if (this.people.hasPersonAsGiftee(potentialGiftee)) {
                    logCallback(`Potential giftee (${potentialGiftee}) is already taken (current gifter is ${currentGifter}).`);
                } else if (this.people.hasNameInBlackList(currentGifter, potentialGiftee)) {
                    logCallback(`Potential giftee (${potentialGiftee}) is in the black list of current gifter (${currentGifter}).`);
                } else if (this.people.hasGifteeForPerson(potentialGiftee, currentGifter)) {
                    logCallback(`Current gifter (${currentGifter}) is is already a giftee of the potential giftee (${potentialGiftee}).`);
                    logCallback('\tTwo people cannot give to one another.');
                } else {
                    this.people.setGifteeOfPerson(currentGifter, potentialGiftee);
                    logCallback(`Current gifter (${currentGifter}) has been assigned a giftee (${potentialGiftee}).`);
                    for (const solution of this.determineGifts(rest)) {
                        yield solution;
                    }
                }
            }
        } else {
            yield this.people.getAllGifters();
        }
    }
}

const app = new GiftExchange(
    program.demo,
    program.logging,
    program.file,
    program.generate
);

if ( ((typeof program.file === 'undefined') || (program.file === '')) &&
     ((typeof program.generate === 'undefined') || (program.generate === '')) &&
     (!program.demo) ) {
    console.log('Use \'gift-picker --help\' to list available options.');
}

if (!app.success) {
    console.log(`The program was not able to calculate the gift exchange.
This could be due to the initial randomization.
Running the program again may net a different result.`);
}
