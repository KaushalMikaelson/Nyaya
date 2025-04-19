import React, { Component } from "react";
import Cards from "./cards";
import main from "../photos/mainup.jpg";
import lawyer from "../photos/lawer.jpg";
import cases from "../photos/cases.jpg";
import deals from "../photos/deals.jpg";
import lawlogo from "../photos/lawlogo.jpg";
import judgement from "../photos/judgement.jpg";
import courtcard from "../photos/courtcard.jpg";


export class Allcards extends Component {
  render() {
    return (
      <>
        <div
          style={{
            position: "relative",
            width: "100vw",
            height: "110vh",
            overflow: "hidden",
          }}
        >
          <img
            src={main}
            alt="Nyaya"
            style={{
              width: "100vw",
              height: "110vh",
              objectFit: "cover", // ensures image fills area nicely
              display: "block",
            }}
          />

          <div
            className="mid-body"
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              color: "white",
              textAlign: "center",
              backgroundColor: "rgba(0, 0, 0, 0.4)",
              padding: "20px 30px",
              borderRadius: "10px",
              width: "80%",
              maxWidth: "900px",
            }}
          >
            <h2 style={{ fontSize: "2.5rem", marginBottom: "15px" }}>
              Benchmarking modernization and excellence in Judicial and Legal
              system
            </h2>
            <h5 style={{ fontSize: "1.3rem", lineHeight: "1.6" }}>
              Nyaya is a transformative platform integrating AI, Blockchain and
              cybersecurity to modernize the Indian Judicial System.
            </h5>
          </div>
        </div>

        <div
          style={{
            backgroundImage: `url(${require('../photos/court.jpg')})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            padding: '40px 0',
          }}
        >

        <div className="row">
          <div className="col-md-4">
            <Cards
              title="Trending"
              image ={lawlogo}
              description="Stay updated with the latest and most discussed legal news, court rulings, and judicial reforms. Explore trending cases, landmark judgments, and policy changes shaping the legal landscape. Get real-time insights on the most impactful stories in the legal world."
              
            />
          </div>
          <div className="col-md-4">
            <Cards
              title="Cases"
              image ={cases}
              description="Discover the most talked-about legal cases shaping the judiciary today. Stay informed on high-profile trials, landmark verdicts, and precedent-setting rulings. Track ongoing cases that are influencing legal discourse nationwide."
            />
          </div>
          <div className="col-md-4">
            <Cards
              title="Jobs"
              image ={deals}
              description="Explore the latest job opportunities in the legal field, from law firms to government positions. Stay updated on trending legal job openings, internships, and clerkships. Find career opportunities that match your expertise and aspirations"
            />
          </div>
          <div className="col-md-4">
            <Cards
              title="Court"
              image ={courtcard}
              description="Stay informed about the latest updates from courts across the country. Get real-time insights on important hearings, case rulings, and judicial announcements. Track key decisions from the Supreme Court, High Courts, and lower courts."
            />
          </div>
          <div className="col-md-4">
            <Cards
              title="Advocates"
              image ={lawyer}
              description="Discover top advocates making an impact in the legal field. Stay updated on prominent lawyers, their landmark cases, and expert legal opinions. Explore insights from leading advocates shaping the future of justice."
            />
          </div>
          <div className="col-md-4">
            <Cards
              title="Judgements"
              image ={judgement}
              description="Stay updated with the latest landmark judgments shaping the legal landscape. Explore important court rulings, precedent-setting decisions, and their impact on law and society. Get insights into how recent verdicts influence future cases"
            />
          </div>
        </div>
        </div>
      </>
    );
  }
}

export default Allcards;
