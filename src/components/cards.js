import React, { Component } from 'react';




export class cards extends Component {


  render() {
    let {title, description, image} = this.props;
    return (
        <div className="my-3">
            <div className="card" style={{width: "23rem",height: "28rem",margin: "auto",borderRadius: 10,color:"white",backgroundColor: 'rgba(0, 0, 0, 0.7)' }}> 
            <img src={image} className="card-img-top" alt="title" style={{height: "200px", width: "100%", borderRadius: 10}}/>
            <div className="card-body">
                <h5 className="card-title" style={{ marginTop: "5px" }}>{title}</h5>
                <p className="card-text" style={{ marginTop: "50px" }}>{description}</p>
                
            </div>
            </div>
        </div>
    )
  }
}

export default cards
