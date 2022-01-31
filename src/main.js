// UI ELEMENTS

const passwordLengthSetting = document.querySelector("#password-length");

const inclusionSettings = document.querySelectorAll(".include");    // Checkboxes for symbols, numbers, lowercase, uppercase
const maximums = document.querySelectorAll(".max");                 // Number input - max characters allowed for each character set
const minimums = document.querySelectorAll(".min");                 // Number input - min characters allowed for each set
const includeDuplicates = document.querySelectorAll(".duplicates"); // Checkboxes whether to allow duplicates for each set

const exclusionSettings = document.querySelectorAll(".exclude");    // Checkboxes for similar and ambiguous characters


// The 'other' settings below are separted because they overwrite 
// the 'include' settings. Any characters included here will be 
// removed from other character sets.
const includeOtherCharsSetting = document.querySelector("#include-other"); // Text input, not a checkbox
const otherCharsMin = document.querySelector("#other-min");
const otherCharsMax = document.querySelector("#other-max");
const otherCharsDuplicates = document.querySelector("#other-duplicates");


// This doesn't overwrite anything, but it is still separated from the 
// exclusionSettings variable because it is a text input rather than a checkbox.
const excludeOtherCharsSetting = document.querySelector("#exclude-other");


const beginWithLetterSetting = document.querySelector("#begin-with-letter");

const passwordOutputArea = document.querySelector("#new-password-area");           
const generatePasswordBtn = document.querySelector("#generate-password-btn");



// CHARACTER SETS


// Each string in these arrays corresponds to a checkbox.
const userCanInclude = [
    "!\"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~",
    "1234567890",
    "abcdefghijklmnopqrstuvwxyz",
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
];

const userCanExclude = [
    "iIl1lL|o0O",               // Similar characters
    "{}[]()/\\'\"`~,;:.<>",     // Ambiguous characters
];


// Only used to check whether a given character is a letter.
const letters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"; 



// GENERATE PASSWORD


/**
 * Generate a password based on user specifications or return an error if input is invalid
 * @returns {String} A newly generated password OR an error message
 */
function generatePassword() {

    // Convert UI elements to usable values
    const beginWithLetter = beginWithLetterSetting.checked;
    const passwordLength = passwordLengthSetting.valueAsNumber;
    const otherExcludedChars = excludeOtherCharsSetting.value;
    const otherIncludedChars = includeOtherCharsSetting.value;


    // Throw error if password length field is NaN or less than 1
    if (!passwordLength || passwordLength < 1) {
        return "Error: Password length must be a number greater than 0.";
    }


    // 2d array with every character specified by user. Separated by character set
    let allowedCharSets = []; 


    // Each index in these arrays corresponds to the index
    // of the associated character set in allowedCharSets

    let mins = [];          // Int; minimum characters required from each charset
    let maxes = [];         // Int; maximum characters allowed from each charset
    let duplicates = [];    // Bool; true if duplicates are allowed, false if not allowed
    let counts = [];        // Int; current number of characters in password from each charset

    

    // Chars to be removed from other charsets. Characters from otherIncludedChars
    // will be reincluded in their own charset.
    let charsToExclude = otherExcludedChars + otherIncludedChars;
    exclusionSettings.forEach((setting, i) => {
        if (setting.checked) {
            charsToExclude += userCanExclude[i];
        }
    });


    // Fill arrays with values
    inclusionSettings.forEach((setting, i) => {

        // If the user included a charset with a maximum above 0
        if (setting.checked && maximums[i].value > 0) {

            mins.push(minimums[i].valueAsNumber);
            maxes.push(maximums[i].valueAsNumber);
            duplicates.push(includeDuplicates[i].checked);
            counts.push(0);
            
            // Change string to array so that allowedCharSets becomes a 2d array
            let charsToInclude = userCanInclude[i].split('');
            charsToInclude.forEach((char, j) => {

                // Remove character if user either specified to exclude it or include it under 'other' characters
                if (charsToExclude.includes(char)) {
                    charsToInclude[j] = "";
                }
            });

            // Remove empty strings in allowedCharSets
            allowedCharSets.push(charsToInclude.join('').split(''));
        }
    });
    


    // If the user specified other characters to be included
    if (otherIncludedChars && otherCharsMax.valueAsNumber > 0) {

        // Remove duplicates and add characters to allowedCharSets
        allowedCharSets.push([...new Set(otherIncludedChars.split(''))]);

        mins.push(otherCharsMin.valueAsNumber);
        maxes.push(otherCharsMax.valueAsNumber);
        duplicates.push(otherCharsDuplicates.checked);
        counts.push(0);
    }

    let hasAtLeastOneLetter = false; // To ensure that it is possible to start with a letter if beginWithLetter is true
    let numberOfCharSets = allowedCharSets.length;

    // Throw error if the user didn't select any charsets
    if (!numberOfCharSets) {
        return "Error: You must select at least one character.";
    }

    
    // Checking that the min and max values are valid
    for (let i = 0; i < numberOfCharSets; i++) {


        // TODO: fix bug where user can specify maxes below 0
        if (mins[i] === NaN || maxes[i] === NaN || mins[i] < 0 || maxes[i] < 0) {
            return "Error: Every min and max field must be a number greater than or equal to 0.";
        }

        if (mins[i] > maxes[i]) {
            return "Error: At least one minimum is greater than its respective maximum.";
        }

        if (mins[i] > allowedCharSets[i].length && !duplicates[i]) {
            return "Error: At least one character set with duplicates disabled has too few characters to meet its required minimum.";
        }

        if (/[a-zA-Z]/.test(allowedCharSets[i].join(''))) {
            hasAtLeastOneLetter = true;
        }
    }

    if (beginWithLetter && !hasAtLeastOneLetter) {
        return "Error: Password must begin with a letter but no letters are selected.";
    }


    const sumArray = (previousValue, currentValue) => previousValue + currentValue;
    if ( maxes.reduce(sumArray) < passwordLength ) {
        return "Error: Total sum of maximums must be greater than or equal to password length.";
    }
    if ( mins.reduce(sumArray) > passwordLength ) {
        return "Error: Total sum of minimums must be less than or equal to password length.";
    }



    // Finished error checking; now we can start the loop
    let returnPassword = ""; // Output string
    let currentPasswordLength = 0; // Length of output string
    let firstIteration = true; // Only used to select at least one letter if beginWithLetter is true


    // While output string has fewer characters than specified password length
    while (currentPasswordLength < passwordLength) {

        let selectCharFrom = ""; // String that chars are randomly picked from
        let charsStillRequired = 0; // Number of chars needed to meet all minimums

        for (let i = 0; i < numberOfCharSets; i++) {

            let difference = mins[i] - counts[i];

            // If the current number of chars from any charset is less than its respective minimum
            if (difference > 0) {

                // Then add the difference to charsStillRequired
                charsStillRequired += difference;
            }
        }

        let charsetsToRemove = []; 

        // Remove charsets that have met their minimums if the number of chars 
        // left to add to the password is equal to (it should never be less than)
        // the number of chars needed to meet all minimums
        if ((passwordLength - returnPassword.length) <= charsStillRequired) {
            for (let i = 0; i < numberOfCharSets; i++) {
                if (counts[i] >= mins[i]) {
                    charsetsToRemove.unshift(i);
                }
            }
        }

        charsetsToRemove.forEach((index) => {
            mins.splice(index, 1);
            maxes.splice(index, 1);
            duplicates.splice(index, 1);
            counts.splice(index, 1);
            allowedCharSets.splice(index, 1);
        });


        // Compile allowedCharSets into the string to randomly pick a character from
        allowedCharSets.forEach((charset) => {

            // If we need to start with a letter, make sure we pick at least one letter
            if (firstIteration && beginWithLetter) {
                let tempCharset = [];

                // For each charset, only include the letters in tempCharset
                charset.forEach((char) => {
                    if (letters.includes(char)) {
                        tempCharset.push(char);
                    }
                });
                selectCharFrom += tempCharset.join('');
                return;
            }

            // If it isn't the first iteration or we don't need to start with a letter, just add the characters to the string
            selectCharFrom += charset.join('');
        });


        // Throw error if we ever run out of valid characters
        if (!selectCharFrom) {
            return "Error: Minimums, maximums, disallowing duplicates, and/or requiring a letter at the beginning prevented the generator from reaching the desired password length.";
        }


    
        let selection = selectCharFrom[Math.floor(Math.random()*selectCharFrom.length)]; // Randomly pick character
        returnPassword += selection; // Add character to eventual output
        currentPasswordLength = returnPassword.length; // Update length of output string



        // Identify which charset the character was taken from
        let indexOfCharset;
        for (let i = 0; i < numberOfCharSets; i++) {
            if (allowedCharSets[i].includes(selection)) {
                counts[i]++;
                indexOfCharset = i;
                break;
            }
        }

        // If duplicates are not allowed in the charset from which the selection was picked
        if (!duplicates[indexOfCharset]) {

            // Remove the character that was selected
            let duplicateIndex = allowedCharSets[indexOfCharset].indexOf(selection);
            allowedCharSets[indexOfCharset].splice(duplicateIndex, 1);
        }


        // Remove any character set that has reached its maximum
        if (counts[indexOfCharset] >= maxes[indexOfCharset]) {
            mins.splice(indexOfCharset, 1);
            maxes.splice(indexOfCharset, 1);
            duplicates.splice(indexOfCharset, 1);
            counts.splice(indexOfCharset, 1);
            allowedCharSets.splice(indexOfCharset, 1);
        }


        firstIteration = false;
    }

    // Randomly scramble output string with Fisher-Yates Shuffle
    returnPassword = returnPassword.split(''); 
    for (let i = passwordLength - 1; i > 0; i--) {
        newIndex = Math.floor(Math.random() * (i + 1));
        let temp = returnPassword[i];
        returnPassword[i] = returnPassword[newIndex];
        returnPassword[newIndex] = temp;
    }

    // If the string must begin with a letter and it does not already
    if (beginWithLetter && !letters.includes(returnPassword[0])) {

        // Loop through string (currently array) until we find a letter
        for (let i = 0; i < passwordLength; i++) {
            if (letters.includes(returnPassword[i])) {

                // Swap first character with letter
                let temp = returnPassword[0];
                returnPassword[0] = returnPassword[i];
                returnPassword[i] = temp;
            }
        }
    }
    
    returnPassword = returnPassword.join(''); // We want to return a string

    return returnPassword;
}

generatePasswordBtn.addEventListener("click", () => {passwordOutputArea.value = generatePassword();});
