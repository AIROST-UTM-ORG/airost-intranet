import '../style/Doc-blog.css';
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import apiClient from '../../../shared/api/client';

const DocBlog = () => {
  const [docs, setDocs] = useState(null);

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const response = await apiClient.get('/airost/doc');
        setDocs(response.data);
      } catch (err) {
        console.error('Failed to fetch docs:', err);
      }
    };

    fetchDocs();
  }, []);

  const { id } = useParams();
  const docBlog = docs?.filter((doc) => doc._id === id);
  const getFontSize = (length) => {
    return length > 50 ? length * 0.8 : 65;
  };
  
  return(
    docBlog?.map((doc) => {
      return (
        <div key={id} className="blog-container">
          <div className="blog-img">
            <img src={doc.image} alt='blog-img' className='blogImage'></img>
          </div>
          <div className="split"></div>
          <div className="blog-content">
            <div className="blog-title" >
              <h1 style={{fontSize:`${getFontSize(doc.title.length)}px`}}>{doc.title}</h1>
            </div>
            <div className="blog-detail">
            <img src={doc.profile} alt='blog-profile' className='blogProfile'></img>
              <div className="blog-author">
                <h3>{doc.author}</h3>
                <h7>{doc.date}</h7>
              </div>
            </div>
            <div className="blog-bio">
              <p>{doc.content}</p>
            </div>
          </div>
        </div>
      )}
  ))
}

export default DocBlog;
