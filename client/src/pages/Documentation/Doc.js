import React, { useEffect, useState } from 'react';
import DocCard from './component/Doc-card';
import TopBar from './component/TopBar';
import './style/global.css';
import { API_URL } from '../../config/api';

const Doc = () => {
  const [articleType, setArticleType] = useState('All');
  const changeType = (newType) => {
    setArticleType(newType);
    console.log(`Change to ${articleType}`);
  };

  //Fetch Data from backend
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

  return ( 
    <div className='doc'>
      <TopBar changeType={changeType}/>
      <DocCard articleType={articleType} docs={docs}/>
    </div>
   );
}
 
export default Doc;
