import { projectsData } from '../../data/project-data';
import { useParams } from "react-router-dom";
import './ProjectDetail.css';

const ProjectDetails = () => {

    const { id } = useParams();
    const project = projectsData[id-1];

    if (!project) {
        return (
            <div className="project-detail p-5">
                <h1 className='title'>Project Not Found</h1>
                <p>No project found with ID {id}.</p>
            </div>
        );
    }

    return ( 
        <div className="project-detail">
            <h1 className='title'>{ project.title }</h1>
            <div className="flex-container">
            <div className="content">
                <h1>Problem Statement</h1>
                <p>{ project.problemStatement }</p>
                <h1>Summary</h1>
                <p>{ project.summary }</p>
                <h1>Resources</h1>
                <p>
                Project handbook: https://docs.google.com/presentation/d/1WfgjvnfRSWaVgm8x5XaVtvL-xEgQaSZOiLbw7OlUGM4/ edit#slide=id.p
                <br />
                Documentation: Google Docs or Notion 
                <br />
                Github Link: blah blah blah
                </p>
            </div>
            <div className="status">
                <h1>Status</h1>
                <p>In progress</p>
            </div>
            </div>
        </div>
     );
}
 
export default ProjectDetails;