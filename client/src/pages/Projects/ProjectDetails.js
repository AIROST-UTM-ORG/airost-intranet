import { projectsData } from '../../data/project-data';
import { useParams } from "react-router-dom";
import ProjectDocumentationLink from '../Documentation/components/ProjectDocumentationLink';
import './ProjectDetail.css';

const ProjectDetails = () => {

    const { id } = useParams();
    const project = projectsData[id-1];
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
                Project handbook: <ProjectDocumentationLink projectId={project?._id || project?.id || id} project={project} />
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