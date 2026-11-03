import './Events.css'
import { useState, useEffect } from 'react'
import { API_URL } from '../../config/api';
// import Modal from 'react-bootstrap/Modal';
// import Spinner from 'react-bootstrap/Spinner';
const { format, parseISO } = require('date-fns');

// Get date-time string for calender
const dateTimeForCalander = (dateStr, timeStr) => {

    let TIMEOFFSET = '+08:00';

     // Parse date and time strings into Date objects
    const parsedDate = parseISO(dateStr, 'yyyy-MM-dd');

    // Format date and time
    const formattedDate = format(parsedDate, 'yyyy-MM-dd');
    
    let newDateTime = `${formattedDate}T${timeStr}:00${TIMEOFFSET}`;

    let event = new Date(Date.parse(newDateTime));

    let startDate = event;

    // Delay in end time is 1
    let endDate = new Date(new Date(startDate).setHours(startDate.getHours()+1));

    return {
        'start': startDate,
        'end': endDate
    }
};

async function fetchEvents() {
    try {
        const response = await fetch(`${API_URL}/api/calendar/upcoming-events`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching events:', error.message);
    }
}

async function addEvent(event) {
    try {
        const response = await fetch(`${API_URL}/api/calendar/add`, {
            method: 'POST',
            body: JSON.stringify(event),
            headers: {
                'Content-Type': 'application/json'
            }
        });
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching events:', error.message);
    }
}

function Events() {

    const [events, setEvents] = useState([]);
    const [date, setDate] = useState("");
    const [time, setTime] = useState("");
    const [eventName, setEventName] = useState("");
    const [venue, setVenue] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(false);

    const fetchData = async () => {
        try {
            setLoading(true);
            const data = await fetchEvents();
            setEvents(data);
        } catch (error) {
            console.error('Error fetching events:', error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);
    
    const handleCloseModal = () => setShowModal(false);
    const handleShowModal = () => {
        setShowModal(true);
    }

    const handleSubmit = async (e) => {

        handleCloseModal();
        e.preventDefault();
        let dateTime = dateTimeForCalander(date, time);

        const event = {
            'summary': eventName,
            'location': venue,
            'start': {
                'dateTime': dateTime['start']
            },
            'end': {
                'dateTime': dateTime['end']
            }
        }

        try {
            const data = await addEvent(event);
            fetchData();
        } catch (error) {
            console.error('Error fetching events:', error.message);
        }
    }

    async function deleteEvent(eventId) {
        try {
            const response = await fetch(`${API_URL}/api/calendar/` + eventId, {
                method: 'DELETE',
            });
            const data = await response.json();
            fetchData();
            return data;
        } catch (error) {
            console.error('Error fetching events:', error.message);
        }
    }

    return ( 
        <div className="content">
            <div className="wrap">
                <div className="calendar">
                    {loading && (
                    <div className="spinner-overlay">
                        <span className="loading loading-spinner loading-lg"></span>
                    </div>
                    )}
                    {!loading && <iframe src="https://calendar.google.com/calendar/embed?height=600&wkst=1&ctz=UTC&bgcolor=%23616161&mode=MONTH&src=bHplbWluOEBnbWFpbC5jb20&src=YWRkcmVzc2Jvb2sjY29udGFjdHNAZ3JvdXAudi5jYWxlbmRhci5nb29nbGUuY29t&color=%23039BE5&color=%2333B679" style={{border:"solid 1px #777",width:"800",height:"600",frameborder:"0",scrolling:"no"}}></iframe>}
                </div>
                <div className="interactions">
                    <button className="btn btn-primary" onClick={()=>document.getElementById('my_modal_2').showModal()}>Add Events</button>
                </div>
                <h4>Upcoming Events</h4>
                {loading && (
                <div className="spinner-overlay">
                    <span className="loading loading-spinner loading-lg"></span>
                </div>
                )}
                {!loading && <div className="upcoming-events">
                    <table>
                        <tbody>
                            <tr>
                                <th>Date</th>
                                <th>Time</th>
                                <th>Event</th>
                                <th>Venue</th>
                                <th></th>
                            </tr>
                            {events && events.map(event => (

                                <tr key={event.id}>
                                    <td>{event.start.dateTime ? format(parseISO(event.start.dateTime), 'yyyy/MM/dd') : "-"}</td>
                                    <td>{event.start.dateTime ? format(parseISO(event.start.dateTime), 'h:mm a')  : "-"}</td>
                                    <td>{event.summary ? event.summary : "-"}</td>
                                    <td>{event.location ? event.location : "-"}</td>
                                    <td id='delete-td'><button id='delete' onClick={() => deleteEvent(event.id)}>Delete</button></td>
                                </tr>

                            ))}
                        </tbody>
                        
                    </table>
                </div>}
            </div>

            {/* <Modal show={showModal} onHide={handleCloseModal}>
                <Modal.Header closeButton>
                    <Modal.Title>Add Event</Modal.Title>
                </Modal.Header>
                    <Modal.Body>
                            <form className="form" id='userForm' onSubmit={handleSubmit}>
                                <div className="subtitle">Event Info</div>

                                <div className="form-floating mb-3">
                                    <input 
                                        id="name" className="form-control" required
                                        type="date" value={date}
                                        onChange={(e) => {setDate(e.target.value)}}/>
                                    <label htmlFor="name" className='form-label'>Date</label>
                                </div>

                                <div className="form-floating mb-3">
                                    <input 
                                        id="name" className="form-control" required
                                        type="time" value={time}
                                        onChange={(e) => {setTime(e.target.value)}}/>
                                    <label htmlFor="name" className='form-label'>Time</label>
                                </div>

                                <div className="form-floating mb-3">
                                    <input 
                                        id="name" className="form-control" required
                                        type="text" value={eventName}
                                        onChange={(e) => {setEventName(e.target.value)}}/>
                                    <label htmlFor="name" className='form-label'>Event Name</label>
                                </div>

                                <div className="form-floating mb-3">
                                    <input 
                                        id="name" className="form-control" required
                                        type="text"value={venue}
                                        onChange={(e) => {setVenue(e.target.value)}}/>
                                    <label htmlFor="name" className='form-label'>Venue</label>
                                </div>
                            </form>
                    </Modal.Body>
                    <Modal.Footer>
                        <button type="submit" form='userForm' className="btn btn-success">Add</button>
                    </Modal.Footer>
                </Modal> */}
                <dialog id="my_modal_2" className="modal">
          <div className="modal-box">
            <form className="form grid grid-cols-1 gap-2" id='userForm' onSubmit={handleSubmit}>
            <h3 className="font-bold text-lg">Add Event</h3>
                                <label className="input input-bordered flex items-center gap-2">
                                    Date
                                    <input 
                                        id="name" className="grow" required
                                        type="date" value={date}
                                        onChange={(e) => {setDate(e.target.value)}}/>
                                </label>

                                <label className="input input-bordered flex items-center gap-2">
                                    Time
                                    <input 
                                        id="name" className="grow" required
                                        type="time" value={time}
                                        onChange={(e) => {setTime(e.target.value)}}/>
                                </label>
                                
                                <label className="input input-bordered flex items-center gap-2">
                                    Event Name
                                    <input 
                                        id="name" className="grow" required
                                        type="text" value={eventName}
                                        placeholder='Fun workshop'
                                        onChange={(e) => {setEventName(e.target.value)}}/>
                                </label>
                
                                <label className="input input-bordered flex items-center gap-2">
                                    Venue
                                    <input 
                                        id="name" className="grow" required
                                        type="text"value={venue}
                                        placeholder='Cairo Lab'
                                        onChange={(e) => {setVenue(e.target.value)}}/>
                                </label>
                                <button type="submit" form='userForm' className="btn btn-neutral w-full">Add</button>
                            </form>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button>close</button>
          </form>
      </dialog>
            
        </div>
        
    );
}
export default Events;
