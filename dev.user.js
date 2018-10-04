// ==UserScript==
// @name        Krazydad Masyu Solver (development)
// @version     1
// @include     https://krazydad.com/tablet/masyu/*
// @run-at      document-idle
// ==/UserScript==

const scriptElement = document.createElement('script');
scriptElement.setAttribute('src', 'http://localhost:8000/masyu-solver.user.js');
document.body.appendChild(scriptElement);
