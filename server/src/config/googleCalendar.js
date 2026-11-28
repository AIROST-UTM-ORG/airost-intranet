const { google } = require('googleapis');

const SCOPES = 'https://www.googleapis.com/auth/calendar';

const parseCredentials = () => {
  if (!process.env.CREDENTIALS) return null;
  try {
    return JSON.parse(process.env.CREDENTIALS);
  } catch (error) {
    return null;
  }
};

const getAuth = () => {
  const credentials = parseCredentials();
  if (!credentials || !credentials.client_email || !credentials.private_key) {
    return null;
  }
  return new google.auth.JWT(
    credentials.client_email,
    null,
    credentials.private_key,
    SCOPES
  );
};

const getCalendar = () => google.calendar({ version: 'v3' });

const getEvents = async (options = {}) => {
  try {
    const auth = getAuth();
    const calendarId = process.env.CALENDAR_ID;
    const calendar = getCalendar();

    const today = new Date();
    const dateTimeStart = new Date(today);
    dateTimeStart.setDate(today.getDate() - 1);
    const dateTimeEnd = new Date(dateTimeStart);
    dateTimeEnd.setDate(dateTimeStart.getDate() + 28);

    const response = await calendar.events.list({
      auth,
      calendarId,
      timeMin: dateTimeStart,
      timeMax: dateTimeEnd,
      singleEvents: true,
      orderBy: 'startTime',
      ...options,
    });

    return response.data.items || [];
  } catch (error) {
    console.error('Error fetching Google Calendar events:', error.message || error);
    throw error;
  }
};

const insertEvent = async (event) => {
  try {
    const auth = getAuth();
    const calendarId = process.env.CALENDAR_ID;
    const calendar = getCalendar();

    const response = await calendar.events.insert({
      auth,
      calendarId,
      resource: event,
    });

    if (response && (response.status === 200 || response.status === 201 || response.statusText === 'OK')) {
      return 1;
    }
    return 0;
  } catch (error) {
    console.error('Error inserting Google Calendar event:', error.message || error);
    return 0;
  }
};

const removeEvent = async (eventId) => {
  try {
    const auth = getAuth();
    const calendarId = process.env.CALENDAR_ID;
    const calendar = getCalendar();

    const response = await calendar.events.delete({
      auth,
      calendarId,
      eventId,
    });

    if (response && (response.data === '' || response.status === 200 || response.status === 204)) {
      return 1;
    }
    return 0;
  } catch (error) {
    console.error('Error deleting Google Calendar event:', error.message || error);
    return 0;
  }
};

module.exports = {
  getEvents,
  insertEvent,
  removeEvent,
};
