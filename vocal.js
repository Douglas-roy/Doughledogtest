let recognition = null;
let targetWords=["cavalier", "fou", "roi", "reine", "tour", "dame",
"petitroque", "grandroque", "court", "égal","prend", "promouvoir", "échec","échec et mat",
"a","b","c","d","e","f","g","h",
"1","2","3","4","5","6","7","8"];

const startRecognition = () => {
    recognition = new webkitSpeechRecognition(); // Initialize SpeechRecognition object
    recognition.lang = 'fr-FR'
    recognition.interimResults = true;
    recognition.onstart = () => {
        console.log('Speech recognition started');
        recognition.grammars = new webkitSpeechGrammarList();
        const grammar = '#JSGF V1.0; grammar targetWords; public <targetWord> = ' + targetWords.join(' | ') + ' ;';
        recognition.grammars.addFromString(grammar, 1);
    };

    recognition.onresult = (event) => {
       
        const transcript = event.results[0][0].transcript;
        let check=[];
        const field=document.getElementById('moveInput');
        
        field.value=transcript.toLowerCase();
        field.classList.remove('invalid-input');
        if(event.results[0].isFinal){
            console.log(transcript);
            check=field.value.split(" ");
            let correctedTranscripts = check.map(transcript => {
                const closestMatch = findClosestMatch(transcript, targetWords);
                return closestMatch ? closestMatch : transcript;
            });
            translate(correctedTranscripts);
            field.value=correctedTranscripts.join("");
            var enterKey = new KeyboardEvent("keydown", {
                key: "Enter",
                keyCode: 13,
              });
            field.dispatchEvent(enterKey);
        }
        

    };
    recognition.addEventListener('end', function() {
        if(document.getElementById('toggleButton').classList.contains('toggled')){
            recognition.start();
        }
        
    });
    recognition.onerror = (event) => {
        console.error('Erreur de reconnaissance vocale:', event.error);
    };

    recognition.start(); // Start speech recognition
};

const stopRecognition = () => {
    if (recognition) {
        recognition.stop(); // Stop speech recognition
        console.log("Stopped");
    }
};

const toggleRecognition = () => {
    const button = document.getElementById('toggleButton');
    const toggleLabel = document.querySelector('.toggle-label');
    if (button.classList.contains('toggled')) {
        stopRecognition(); 
        toggleLabel.textContent='Speech Off';
        button.classList.remove('toggled');
    } else {
        startRecognition(); 
        toggleLabel.textContent='Speech On';
        button.classList.add('toggled');
    }
};

function translate(transcript){
    const translations = {
        "prend": "x",
        "cavalier": "N",
        "dame": "Q",
        "fou": "B",
        "tour": "R",
        "roi": "K",
        "grandroque": "O-",//probleme petit et grand rock
        "petitroque": "O-O",
        "court": "",
        "égual":"=",
        "promouvoir":"=",
        "échec": "+",
        "échec et mat": "#",
        "d":"d",//I slur my words
        "c":"c",
        "b":"b",
        "un": "1",
        "deux": "2",
        "trois": "3",
        "quatre": "4",
        "cinq": "5",
        "six": "6",
        "sept": "7",
        "huit": "8",
        "gameplay": "",
        "lawn":"O-",
        "route": "R",
        "rip": "R",
        "à": "a",
        "rock" : "roque",
        "p'tit": "petit",
    };

    // Ignorer "pion"
    transcript = transcript.filter(word => word !== "pion");
    for (let i = 0; i < transcript.length; i++) {
        if (translations.hasOwnProperty(transcript[i])) {
            transcript[i] = translations[transcript[i]];
        }
    }
    return transcript;
}
function findClosestMatch(word, targetWords) {
    const distances = targetWords.map(targetWord => levenshteinDistance(word, targetWord));
    const minDistance = Math.min(...distances);
    return minDistance < word.length / 2 ? targetWords[distances.indexOf(minDistance)] : null;
}

// Function to calculate Levenshtein distance between two strings
function levenshteinDistance(s1, s2) {
    const dp = Array(s1.length + 1).fill(null).map(() => Array(s2.length + 1).fill(null));

    for (let i = 0; i <= s1.length; i++) {
        dp[i][0] = i;
    }

    for (let j = 0; j <= s2.length; j++) {
        dp[0][j] = j;
    }

    for (let i = 1; i <= s1.length; i++) {
        for (let j = 1; j <= s2.length; j++) {
            const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
            dp[i][j] = Math.min(
                dp[i - 1][j] + 1, // deletion
                dp[i][j - 1] + 1, // insertion
                dp[i - 1][j - 1] + cost // substitution
            );
        }
    }

    return dp[s1.length][s2.length];
}
document.getElementById('toggleButton').addEventListener('click', toggleRecognition);