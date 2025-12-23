let time = 60;
let intervalId = setInterval(() => {
  if (time > 0) {
    console.log(`Compte à rebours : ${time} secondes`);
  } else {
    clearInterval(intervalId);
  }
  time--;
}, 1000);