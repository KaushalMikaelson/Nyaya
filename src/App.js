import './App.css';

import React, { Component } from 'react'
import Navbar from './components/Navbar';
import Allcards from './components/Allcards';
import Footer from './components/Footer';

export default class App extends Component{
  render(){ 
    return(
      <>
      <div>
      
      <Navbar/>
      <Allcards/>
      <Footer/>
      </div>
      
      
      </>

    )
  }
}

