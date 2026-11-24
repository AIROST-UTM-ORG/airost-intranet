import apiClient from '../../../shared/api/client';

export const fetchUsers = () => apiClient.get('/user/users');

export const createVerifiedUser = ({ name, email, position }) =>
    apiClient.post('/admin/users/verified', { name, email, position });