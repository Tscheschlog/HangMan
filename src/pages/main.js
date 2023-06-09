import React, { useEffect, useState } from "react";
import { Link } from 'react-router-dom';
import { doc, getDoc, getDocs, collection, updateDoc, FieldValue } from 'firebase/firestore';
import { db } from "../services/firebase"; 
import "./styles/index.css";
import Leaderboard from "../components/Leaderboard";
import ShareScreen from '../pages/share';
const wordRef = collection(db, 'Words');

// Arrays of words for games grouped by difficulty
let easyWords = [];
let easyDefines = [];
let mediumWords = [];
let mediumDefines = [];
let hardWords = [];
let hardDefines = [];

// Get the difficulty from local storage -> default to easy
let difficulty =  localStorage.getItem('difficulty') || "easy";

// Generate the indexes used for each difficulty (0 -> max)
function generateUniqueIndexes(max) {
  let numbers = new Set();

  while (numbers.size < 5) {
    let num = Math.floor(Math.random() * (max + 1));
    numbers.add(num);
  }

  return Array.from(numbers);
}

// Get the words for each difficulty level
function generateWordArrays() {

  // Empty the arrays
  easyWords = [];
  easyDefines = [];
  mediumWords = [];
  mediumDefines = [];
  hardWords = [];
  hardDefines = [];

  getDocs(wordRef).then((querySnapshot) => {
    console.log('------------------------------------');
    querySnapshot.forEach((doc) => {

      // 0 - 19 => 20 words total for each difficulty level
      generateUniqueIndexes(19).forEach((item) => {
        easyWords.push(doc.data().easy[item]);
        easyDefines.push(doc.data().easyDefs[item]);
        mediumWords.push(doc.data().medium[item]);
        mediumDefines.push(doc.data().mediumDefs[item]);
        hardWords.push(doc.data().hard[item]);
        hardDefines.push(doc.data().hardDefs[item]);
      })
    });
  });
}
generateWordArrays();

// Current word list and their definitions
let words = [];
let definitions = [];
let currDefinition = "";

// Total number of guesses
const maxGuesses = 6;

function MainScreen() {
  const [word, setWord] = useState("");
  const [guesses, setGuesses] = useState(new Set());
  const [correct, setCorrect] = useState(new Set());
  const [remainingGuesses, setRemainingGuesses] = useState(maxGuesses);
  const [remainingChars, setRemainingChars] = useState(0);
  const [showDifficultyButtons, setShowDifficultyButtons] = useState(false);

  function toggleLeaderBoard() {
    // Get the leaderboard container
    const leaderboard = document.querySelector(".leaderboard-container");

    if(leaderboard != null) {
      leaderboard.classList.toggle("hide-element");
    }
  }

  function shareButton() {
    return (
      <Link to="/share">
        <button className="share-btn game-btn">Share Your Word</button>
      </Link>
    );
  }


  function handleNewGameClick(self) {
    // Display the difficulty buttons when the "New Game" button is clicked
    setShowDifficultyButtons(true);
    self.classList.toggle("hide-element");
  }

  function setDifficulty() {
    let diffy = localStorage.getItem('difficulty');

    if(diffy === "easy") {
      words = easyWords;
      definitions = easyDefines;
    }
    else if(diffy === "medium") {
      words = mediumWords;
      definitions = mediumDefines;
    }
    else {
      words = hardWords;
      definitions = hardDefines;
    }
  }

  function difficultyButtonClick(diffy) {
    setShowDifficultyButtons(false);

    // Save to local storage
    difficulty = diffy;
    localStorage.setItem('difficulty', difficulty);

    setDifficulty();
    newGame();
  }

  // This function sets the initial state of the game to start a new round
  function newGame() {
    let randomIndex = Math.floor(Math.random() * words.length);
    const newWord = words[randomIndex].toLowerCase();
    const newDef = definitions[randomIndex];

    // Remove the selected index from the arrays
    words.splice(randomIndex, 1);
    definitions.splice(randomIndex, 1);

    if(words.length == 0) {
      generateWordArrays();
      setDifficulty();
    }

    // Set the current definition to the new definition
    currDefinition = newDef;

    setWord(newWord);
    setGuesses(new Set());
    setCorrect(new Set());
    setRemainingGuesses(maxGuesses);
    setRemainingChars(new Set(newWord).size);

    // Remove the "hide-element" class from the element
    const hintElement = document.querySelector(".hint-box");
    hintElement.classList.remove("hide-element");

    const defDisplay = hintElement.querySelector(".word-definition-show");

    // Reset the definition button
    if (defDisplay != null) {
      defDisplay.classList.remove("word-definition-show");
      defDisplay.classList.add("word-definition-hidden");
      defDisplay.innerHTML = "View Definition";
    }
   
    // Reset the keys to unpressed
    const keyboardKeys = document.querySelector(".keyword-btn-grp");

    if(keyboardKeys != null) {

      for (let i = 0; i < keyboardKeys.children.length; i++) {
        keyboardKeys.children[i].className ="keyword-btn";
      }
    }

  }

  function displayWord() {
    let display = "";
    for (const letter of word) {
      if (correct.has(letter)) {
        display += letter;
      } else {
        display += "_";
      }
      display += " ";
    }
    return <div className="display-word">{display}</div>;
  }

  // This function will give hints for the player
  function giveHint(item) {
    item.innerHTML = currDefinition;
    item.className= "word-definition-show";
  }

  // This useEffect hook checks if the game is over after every guess
  useEffect(() => {

    // Update the players score in the Database
    async function uploadPlayerScore(newScore) {
      const playerRef = doc(db, 'Players', localStorage.getItem("username"));
      const playerDoc = await getDoc(playerRef);
      const existingScores = playerDoc.data().scores || [];
      const updatedScores = [...existingScores, newScore];
      await updateDoc(playerRef, { scores: updatedScores }, { merge: true });
      console.log("Added Score: " + newScore + ", Player: " +
       localStorage.getItem("username") + ", Score List: " + updatedScores);    }

    console.log('remainingChars = ', remainingChars)
    if (remainingGuesses === 0) {
      const score = calculateScore(remainingChars, remainingGuesses);
      alert("Game over! The word was " + word + " You gained " + score + ' points!');

      // Add the players score to the db
      uploadPlayerScore(score);

      newGame();
    } else if (correct.size !== 0 && remainingChars === 0 ) {
      const score = calculateScore(remainingChars, remainingGuesses);
      alert("You win! You gained " + score + ' points for this round');
      
      // Add the players score to the db
      uploadPlayerScore(score);

      // Begin a new game
      newGame();
    }
  }, [remainingGuesses, correct, word, remainingChars]);

  function guess(letter) {
    if (guesses.has(letter)) {
      alert("You already guessed that letter!");
      return;
    }
    const newGuesses = new Set(guesses);
    newGuesses.add(letter);
    setGuesses(newGuesses);

    if (word.includes(letter)) {
      setRemainingChars(remainingChars-1);
      const newCorrect = new Set(correct);
      newCorrect.add(letter);
      setCorrect(newCorrect);
    } else {
      setRemainingGuesses(remainingGuesses - 1);
    }
  }

  //this part render the virtual keyboard component
  function Keyboard() {
    const letters = "qwertyuiopasdfghjklzxcvbnm".split("");

    function handleClick(button, letter) {
      button.className = 'used-btn';
      guess(letter);
    }

    return (
      <div className="keyword-btn-grp">
        {letters.map((letter) => 
          (
            <button
              key={letter}
              onClick={(event) => handleClick(event.target, letter)}
              disabled={guesses.has(letter)}
              className="keyword-btn"
            >
              {letter.toUpperCase()}
            </button>
          )
        )}
      </div>
    );
  }
  function calculateScore( remainingChars, remainingGuesses) {
    if (remainingChars === 0) { //win
      return remainingGuesses * 10 + 100;
    } else { //lose
      return Math.floor((1 - remainingChars / word.length) * 70); // partial credit for wrong guesses
  }

  }

  return (
    <div className="app-container">
      <h1 className="hangman-heading">Hangman</h1>
      {word && displayWord()}
      <div className="hint-box hide-element">
        <p 
        className="word-definition word-definition-hidden"
        onClick={(event) => giveHint(event.target)}
        >
          View Definition
        </p>
      </div>
      {remainingGuesses > 0 && correct.size < word.length && (
        Keyboard()
      )}
      {true && (
        <div>
        {/* Conditionally render the new buttons */}
        {showDifficultyButtons && (
          <div className="difficulty-btn-group">
            <button onClick={() => difficultyButtonClick("easy")} className="game-btn">Easy</button><br></br>
            <button onClick={() => difficultyButtonClick("medium")} className="game-btn">Medium</button><br></br>
            <button onClick={() => difficultyButtonClick("hard")} className="game-btn">Hard</button>
          </div>
        )}
  
        {/* Render the "New Game" button */}
        <button onClick={(event) => handleNewGameClick(event.target)} className="new-game-btn">New Game</button>
      </div>
      )}
       {shareButton()}
      <button onClick={() => toggleLeaderBoard()} className="game-btn">Display Leaderboard</button>
      <Leaderboard />
    </div>
  );
}

export default MainScreen;