import React, { Component } from 'react';
import constitutionDataRaw from '../indian_constitution.json'; // Importing your raw JSON data

export class Navbar extends Component {
  constructor(props) {
    super(props);
    this.state = {
      searchQuery: '', // Stores the current search query entered by the user
      searchResults: [], // Stores the search results that match the query
      loading: false, // Tracks the loading state for search operation
      error: null, // Tracks any errors during the search
      showResults: false, // Flag to control visibility of the search results
    };
    // Process the data on initialization
    this.flattenedData = this.preprocessData(constitutionDataRaw);
  }

  // Preprocess data to make it easier for searching
  preprocessData(data) {
    return data.map(item => ({
      ...item,
      titleText: item.section_title ? item.section_title.toLowerCase() : '', // Convert section title to lowercase for easy matching
      descriptionText: item.section_desc ? item.section_desc.toLowerCase() : '', // Convert section description to lowercase for easy matching
      chapterText: item.chapter_title ? item.chapter_title.toLowerCase() : '', // Convert chapter title to lowercase
    }));
  }

  // Handle the search query input change
  handleSearchChange = (event) => {
    const query = event.target.value;
    this.setState({ searchQuery: query });
    // If the search query is empty, clear the results and hide them
    if (query.trim() === '') {
      this.setState({ searchResults: [], showResults: false });
    } else {
      this.performSearch(query); // Perform search if there's a query
    }
  };

  // Handle the form submission for searching
  handleSearchSubmit = (event) => {
    event.preventDefault();
    if (this.state.searchQuery.trim() !== '') {
      this.performSearch(this.state.searchQuery); // Perform search on submit
    }
  };

  // Perform the search operation
  performSearch(query) {
    this.setState({ loading: true, error: null, showResults: true }, () => {
      const lowerQuery = query.toLowerCase(); // Convert the query to lowercase for comparison
      // Filter the flattened data to find matches
      const results = this.flattenedData.filter(item =>
        item.titleText.includes(lowerQuery) ||
        item.descriptionText.includes(lowerQuery) ||
        item.chapterText.includes(lowerQuery)
      ).map(item => ({
        id: item.Section, // Use Section as the ID
        title: item.section_title || 'Section', // Section title
        description: item.section_desc || 'No description available', // Section description
        chapter: item.chapter_title || 'Unknown Chapter', // Chapter title
      }));
      this.setState({ searchResults: results, loading: false }); // Update the state with the search results
    });
  }

  // Opens the selected article in a new tab with detailed information
  openArticleInNewTab(item) {
    const newWindow = window.open('', '_blank');
    const htmlContent = `
      <html>
        <head>
          <title>${item.title} (Section ${item.id})</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; }
            h1 { color: #333; }
            h2 { margin-top: 20px; }
            strong { font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>${item.title} (Section ${item.id})</h1>
          <p>${item.description}</p>
          <p><strong>Chapter:</strong> ${item.chapter}</p>
        </body>
      </html>
    `;
    newWindow.document.write(htmlContent); // Write the HTML content for the article in the new tab
    newWindow.document.close();
  }

  render() {
    const { searchQuery, searchResults, loading, error, showResults } = this.state;
    return (
      <div>
        {/* Navigation Bar */}
        <nav className="navbar navbar-expand-lg  " style={{ backgroundColor: 'black' }}>
          <div className="container-fluid" style={{ padding: 25, display: "flex", justifyContent: "center", alignItems: "center",backgroundColor: "black" }}>
            <a className="navbar-brand" href="/" style={{ color: "white" }}>Nyaya</a>
            <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarSupportedContent">
              <span className="navbar-toggler-icon"></span>
            </button>
            <div className="collapse navbar-collapse" id="navbarSupportedContent">
              <ul className="navbar-nav me-auto mb-2 mb-lg-0">
                <li className="nav-item">
                  <a className="nav-link active" href="/" style={{ color: "white" }}>Home</a>
                </li>
                <li className="nav-item">
                  <a className="nav-link disabled" href="/" style={{ color: "white" }}>About</a>
                </li>
              </ul>
              <div className="mybutton" style={{ display: "flex", justifyContent: "center", flexGrow: 1 }}>
                <form className="d-flex" role="search" onSubmit={this.handleSearchSubmit}>
                  <input
                    className="form-control me-2"
                    type="search"
                    placeholder="Search sections..."
                    aria-label="Search"
                    style={{ width: "400px" }}
                    value={searchQuery}
                    onChange={this.handleSearchChange}
                  />
                  <button className="btn btn-outline-success" type="submit" disabled={loading}>
                    {loading ? 'Searching...' : 'Search'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </nav>
        {/* Search Results */}
        {showResults && (
          <div className="container mt-4">
            {loading && <p>Loading...</p>}
            {error && <p className="text-danger">Error: {error}</p>}
            {searchResults.length > 0 ? (
              <div>
                <h3>Search Results</h3>
                <ul className="list-group">
                  {searchResults.map((item) => (
                    <li key={item.id} className="list-group-item">
                      <h5
                        style={{ cursor: 'pointer', color: '#0d6efd' }}
                        onClick={() => this.openArticleInNewTab(item)}
                      >
                        {item.title} (Section {item.id})
                      </h5>
                      <p>{item.description.substring(0, 150)}...</p>
                      <p className="text-muted">Chapter: {item.chapter}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              searchQuery && !loading && !error && <p>No sections found related to "{searchQuery}".</p>
            )}
          </div>
        )}
      </div>
    );
  }
}

export default Navbar;