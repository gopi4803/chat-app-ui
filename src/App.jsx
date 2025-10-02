import './App.css'
import Login from './components/auth/Login'
import { Route,Routes } from 'react-router-dom'
import SignUp from './components/auth/SignUp'
import ForgotPassword from './components/auth/ForgotPassword'
import { Provider } from 'react-redux'
import store from './components/redux/store'
import Dashboard from './components/home/Dashboard'
import IncorrectPage from './components/auth/IncorrectPage'
import ProtectedRoute from './components/auth/ProtectedRoute'

function App() {

  return (
    <Provider store={store}>
    <Routes>
      <Route path='/' element={<Login />}></Route>
      <Route path='log-in' element={<Login />}></Route>
      <Route path='sign-up' element={<SignUp />}></Route>
      <Route path='forgot-password' element={<ForgotPassword />}></Route>
      <Route
        path='dashboard'
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }>
      </Route>
      <Route path='*' element={<IncorrectPage />} ></Route>
    </Routes>
    </Provider>
  )
}

export default App
