import hide from "../../assets/hide.png";
import visible from "../../assets/visible.png";
import google from "../../assets/google.png";
import { Link, useNavigate } from "react-router-dom";
import { Formik, Form, Field, ErrorMessage } from "formik";
import {
  setUserName,
  setEmail,
  setPassword,
  togglePasswordVisibility,
  clearAuthForm
} from "../redux/authSlice";
import { useDispatch, useSelector } from "react-redux";
import { signUpValidationSchema } from "../schema/validationSchema";
import { signup } from "../uitility/authApi";
import { useEffect } from "react";

const SignUp = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { username, email, password, confirmPassword, showPassword } =
    useSelector((state) => state.auth);
    useEffect(() => {
    dispatch(clearAuthForm());
  }, [dispatch]);
  const handleSignUp = async (values, { setSubmitting,setErrors,resetForm }) => {
    try {
        const response=await signup({
            username:values.username,
            email:values.email,
            password:values.password
        })
        const user=response.data;
        console.log("User ",user);
        dispatch(setUserName(values.username));
        dispatch(setEmail(values.email));
        dispatch(setPassword(values.password));
        resetForm();
        navigate("/log-in");
    } catch (error) {
        console.error("Signup failed:", error.response?.data || error.message);
        setErrors({ email: "Email is already taken." });
    }finally{
        setSubmitting(false);
    }
  };
  return (
    <div className="flex h-screen">
      <div className="flex-1 flex flex-col items-center justify-center bg-white">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="black"
          viewBox="0 0 24 24"
          className="w-20 h-20 mb-4"
        >
          <path d="M12 2C6.48 2 2 6.02 2 10.5C2 13.11 3.53 15.42 6 16.93V22L10.38 19.47C10.9 19.49 11.44 19.5 12 19.5C17.52 19.5 22 15.98 22 11.5C22 7.02 17.52 2 12 2Z" />
        </svg>
        <div className="font-bold text-xl text-black">Chat-App</div>
        <div className="font-bold text-black">Welcome back!</div>
        <div className="font-bold text-black">Please create an account</div>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-2 bg-gray-900">
        <Formik
          initialValues={{ username, email, password, confirmPassword }}
          validationSchema={signUpValidationSchema}
          validateOnMount={true}
          onSubmit={handleSignUp}
        >
          {({ isSubmitting, isValid, handleSubmit }) => (
            (
              <Form className="" onSubmit={handleSubmit}>
                <div className="w-full flex flex-col space-y-4 gap-4">
                  <h2 className="font-bold text-gray-300">SIGN UP</h2>
                  {/* username field  */}
                  <div className="flex flex-col relative w-full mt-1">
                    <label
                      htmlFor="username"
                      className="font-bold absolute text-gray-300 left-2 -top-6"
                    >
                      Username
                    </label>
                    <Field
                      type="text"
                      placeholder="Enter Username"
                      id="username"
                      name="username"
                      className="bg-gray-300 text-gray-900 rounded-lg placeholder-gray-900 text-center py-2 px-2 w-full"
                    />
                    <ErrorMessage
                      name="username"
                      component="p"
                      className="text-red-500 text-sm mt-1 absolute left-1/2 -translate-x-1/2 -bottom-5 text-center w-full min-h-[20px] whitespace-nowrap"
                    />
                  </div>

                  {/* email field  */}
                  <div className="flex flex-col relative w-full mt-1">
                    <label
                      htmlFor="email"
                      className="font-bold absolute text-gray-300 left-2 -top-6"
                    >
                      Email
                    </label>
                    <Field
                      type="email"
                      placeholder="Enter Email"
                      id="email"
                      name="email"
                      className="bg-gray-300 text-gray-900 rounded-lg placeholder-gray-900 text-center py-2 px-2 w-full"
                    />
                    <ErrorMessage
                      name="email"
                      component="p"
                      className="text-red-500 text-sm mt-1 absolute left-1/2 -translate-x-1/2 -bottom-5 text-center w-full min-h-[20px] whitespace-nowrap"
                    />
                  </div>

                  {/* password field  */}
                  <div className="flex flex-col relative w-full mt-1">
                    <label
                      htmlFor="password"
                      className="font-bold absolute text-gray-300 left-2 -top-6"
                    >
                      Password
                    </label>
                    <Field
                      type={showPassword.password ? "text" : "password"}
                      placeholder="Enter Password"
                      id="password"
                      name="password"
                      className="bg-gray-300 text-gray-900 rounded-lg placeholder-gray-900 text-center py-2 px-2 w-full"
                    />
                    <img
                      src={showPassword.password ? visible : hide}
                      alt=""
                      onClick={() =>
                        dispatch(togglePasswordVisibility("password"))
                      }
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 cursor-pointer hover:opacity-75 hover:scale-110 transition-all duration-200"
                    />
                    <ErrorMessage
                      name="password"
                      component="p"
                      className="text-red-500 text-sm mt-1 absolute left-1/2 -translate-x-1/2 -bottom-5 text-center w-full min-h-[20px] whitespace-nowrap"
                    />
                  </div>

                  {/* confirm password field  */}
                  <div className="flex flex-col relative w-full mt-1">
                    <label
                      htmlFor="confirmPassword"
                      className="font-bold absolute text-gray-300 left-2 -top-6"
                    >
                      Confirm Password
                    </label>
                    <Field
                      type={showPassword.confirmPassword ? "text" : "password"}
                      placeholder="Confirm Password"
                      id="confirmPassword"
                      name="confirmPassword"
                      className="bg-gray-300 text-gray-900 rounded-lg placeholder-gray-900 text-center py-2 px-2 w-full"
                    />
                    <img
                      src={showPassword.confirmPassword ? visible : hide}
                      onClick={() =>
                        dispatch(togglePasswordVisibility("confirmPassword"))
                      }
                      alt=""
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 cursor-pointer hover:opacity-75 hover:scale-110 transition-all duration-200"
                    />
                    <ErrorMessage
                      name="confirmPassword"
                      component="p"
                      className="text-red-500 text-sm mt-1 absolute left-1/2 -translate-x-1/2 -bottom-5 text-center w-full min-h-[20px] whitespace-nowrap"
                    />
                  </div>
                  {/* Login and Sign Up Buttons */}
                  <div className="flex flex-col items-center">
                    <button
                      type="submit"
                      disabled={isSubmitting || !isValid}
                      className={`rounded-full px-6 py-2 w-40 font-semibold shadow-md 
                      ${
                        isValid
                          ? "bg-gray-300 text-gray-900 cursor-pointer"
                          : "bg-gray-500 text-gray-700 cursor-not-allowed"
                      }`}
                      onClick={() => console.log("Submit button clicked")}
                    >
                      {isSubmitting ? "Signing Up" : "Signup"}
                    </button>

                    <div>
                      <p className="text-gray-400 font-bold mt-4">
                        Already have an account?
                        <Link
                          to="/log-in"
                          className="font-bold text-gray-300 ml-1 cursor-pointer hover:scale-110 transition-all duration-200 inline-block"
                        >
                          LogIn here!
                        </Link>
                      </p>
                    </div>
                    <div className="w-full">
                      <button
                        type="button"
                        className="flex items-center justify-center bg-gray-300 text-gray-900 rounded-full px-6 py-3 w-full font-semibold shadow-md mt-6 space-x-3 cursor-pointer"
                      >
                        <img
                          src={google}
                          alt="Google Logo"
                          className="w-5 h-5"
                        />
                        <span>Sign up with Google</span>
                      </button>
                    </div>
                  </div>
                </div>
              </Form>
            )
          )}
        </Formik>
      </div>
    </div>
  );
};

export default SignUp;
