import '../style/Doc-blog.css';
import React from 'react';
import { Link } from "react-router-dom";
import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { API_URL } from '../../../config/api';

const DocBlog = () => {
  const [docs, setDocs] = useState(null)

  useEffect(() => {
    const fetchDocs = async () => {
      const response = await fetch(`${API_URL}/api/airost/doc`)
      const json = await response.json()

      if (response.ok) {
        setDocs(json)
      }
    }

    fetchDocs()
  }, [])

  const { id } = useParams();
  const docBlog = docs?.filter((doc)=>doc._id===id);
  const getFontSize = (textLength) => {
    var textLength =  (textLength > 50) ? textLength*0.8 :
                      textLength=65;
    return textLength;
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
