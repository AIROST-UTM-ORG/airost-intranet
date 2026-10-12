import '../style/Doc-card.css';
import React from 'react';
import { Link } from "react-router-dom";

const DocCard = ({ docs, articleType, searchQuery }) => {
  const filteredByType =
    articleType === 'All'
      ? docs
      : docs?.filter((doc) => {
          if (articleType === 'Web & Apps' || articleType === 'Web & App Resources') {
            return doc.type === 'Web & Apps' || doc.type === 'Web & App Resources';
          }
          return doc.type === articleType;
        });

  const finalDocs = searchQuery
    ? filteredByType?.filter((doc) =>
        doc.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.author?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.type?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : filteredByType;

  if (!finalDocs || finalDocs.length === 0) {
    return (
      <div className="no-articles">
        <h3>No resources found</h3>
        <p>Try selecting a different category or adjusting your search keyword.</p>
      </div>
    );
  }

  return (
    <div className="articleContainer">
      {finalDocs.map((doc, index) => {
        const id = doc._id || doc.id || index;
        return (
          <div key={id} className="articleCard">
            <Link to={`/doc/${id}`} className="articleLink">
              <div className="articleImageWrapper">
                <img src={doc.image} alt={doc.title} className="articleImage" />
              </div>
              <div className="articleContent">
                <div className="articleDetail">
                  <span className="author-name">{doc.author}</span>
                  <span className="dot">•</span>
                  <span className="publish-date">{doc.date}</span>
                  <span className="dot">•</span>
                  <span className="category-tag">{doc.type}</span>
                </div>
                <h2 className="articleTitle">{doc.title}</h2>
                <p className="articleDescription">{doc.description}</p>
              </div>
            </Link>
          </div>
        );
      })}
    </div>
  );
};

export default DocCard;

