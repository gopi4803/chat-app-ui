import axios from "axios";

const API_URL="http://localhost:8080";
export const signup=(signupData)=>{
    return axios.post(`${API_URL}/sign-up`,signupData);
}
export const login=(loginData)=>{
    return axios.post(`${API_URL}/log-in`,loginData);
}