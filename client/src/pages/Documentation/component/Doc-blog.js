import '../style/Doc-blog.css';
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { documentationData as localDocData } from '../Doc-content';
import { API_URL } from '../../../config/api';

const DocBlog = () => {
  const [docs, setDocs] = useState(localDocData);
  const { id } = useParams();

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const response = await fetch(`${API_URL}/airost/doc`);
        if (response.ok) {
          const json = await response.json();
          if (Array.isArray(json) && json.length > 0) {
            setDocs(json);
            return;
          }
        }
      } catch (err) {
        console.warn('Backend fetch error, using fallback:', err);
      }
      setDocs(localDocData);
    };

    fetchDocs();
  }, []);

  const doc = docs?.find((d) => d._id === id || String(d.id) === String(id));

  const getFontSize = (length) => {
    if (length > 50) return length * 0.8;
    return 65;
  };
  
  if (!doc) {
    return (
      <div style={{ padding: '60px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>Article Not Found</h2>
        <Link to="/doc" style={{ color: '#2563eb', textDecoration: 'underline' }}>
          Back to Documentation
        </Link>
      </div>
    );
  }

  return (
    <div className="blog-container">
      <div className="blog-img">
        <img src={doc.image} alt="blog-img" className="blogImage" />
      </div>
      <div className="split"></div>
      <div className="blog-content">
        <div style={{ marginBottom: '12px' }}>
          <Link to="/doc" style={{ color: '#64748b', textDecoration: 'none', fontSize: '14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            ← Back to Documentation
          </Link>
        </div>
        <div className="blog-title">
          <h1 style={{ fontSize: `${getFontSize(doc.title.length)}px` }}>{doc.title}</h1>
        </div>
        <div className="blog-detail">
          <img src={doc.profile || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"} alt="blog-profile" className="blogProfile" />
          <div className="blog-author">
            <h3>{doc.author}</h3>
            <span>{doc.date} • {doc.type}</span>
          </div>
        </div>
        <div className="blog-bio">
          <p>{doc.content || doc.description}</p>
        </div>
      </div>
    </div>
  );
};

export default DocBlog;