import hide from "../../assets/hide.png";
import visible from "../../assets/visible.png";
import google from "../../assets/google.png";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { loginValidationSchema } from "../schema/validationSchema";
import { useDispatch, useSelector } from "react-redux";
import { DevTool } from "@hookform/devtools";
import {
  setEmail,
  setPassword,
  togglePasswordVisibility,
  setToken,
  clearAuthForm,
} from "../redux/authSlice";
import { login } from "../uitility/authApi";
import { useEffect } from "react";
import { setAccessToken } from "../uitility/api";
import { scheduleTokenRefresh } from "../uitility/authTokenManager";

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { email, password, showPassword } = useSelector((state) => state.auth);
  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    mode: "onTouched",
    resolver: yupResolver(loginValidationSchema),
  });
  const { register, control, handleSubmit, formState, reset } = form;
  const { errors, isValid } = formState;
  useEffect(() => {
    dispatch(clearAuthForm());
    reset();
  }, [dispatch, reset]);
  const onSubmit = async (data) => {
    try {
      const response = await login({
        email: data.email,
        password: data.password,
      });

      const { accessToken } = response.data;

      if (accessToken) {
        setAccessToken(accessToken);

        dispatch(setToken(accessToken));
        dispatch(setEmail(data.email));
        dispatch(setPassword(data.password));

        scheduleTokenRefresh();

        navigate("/dashboard");
      } else {
        throw new Error("Access token not found in response");
      }
    } catch (err) {
      console.error("Login failed:", err.response?.data || err.message);
      alert(err.response?.data?.message || "Invalid credentials");
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
        <div className="font-bold text-black">Please login to your account</div>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-2 bg-gray-900">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="w-full flex flex-col space-y-4 gap-4">
            <h2 className="font-bold text-gray-300">LOG IN</h2>

            {/* Email field  */}
            <div className="flex flex-col relative w-full">
              <label
                htmlFor="email"
                className="font-bold absolute text-gray-300 left-2 -top-6"
              >
                Email
              </label>
              <input
                type="email"
                id="email"
                placeholder="Enter Email"
                defaultValue={email}
                {...register("email")}
                className="bg-gray-300 text-gray-900 rounded-lg placeholder-gray-900 text-center py-2 w-full"
              />
              <p className="text-red-500 text-sm mt-1 absolute left-1/2 -translate-x-1/2 -bottom-5 text-center w-full min-h-[20px] whitespace-nowrap overflow-hidden text-ellipsis">
                {errors.email?.message}
              </p>
            </div>

            {/* password field  */}
            <div className="flex flex-col relative w-full">
              <label
                htmlFor="password"
                className="font-bold absolute text-gray-300 left-2 -top-6"
              >
                Password
              </label>
              <input
                type={showPassword.password ? "text" : "password"}
                id="password"
                defaultValue={password}
                placeholder="Enter Password"
                {...register("password")}
                className="bg-gray-300 text-gray-900 rounded-lg placeholder-gray-900 text-center py-2 w-full"
              />
              <img
                src={showPassword.password ? visible : hide}
                alt={showPassword.password ? "Hide Password" : "Show Password"}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 cursor-pointer hover:opacity-75 hover:scale-110 transition-all duration-200"
                onClick={() => dispatch(togglePasswordVisibility("password"))}
              />
              <p className="text-red-500 text-sm mt-1 absolute left-1/2 -translate-x-1/2 -bottom-5 text-center w-full min-h-[20px] whitespace-nowrap">
                {errors.password?.message}
              </p>
            </div>
            <Link
              to="/forgot-password"
              className="mb-0 text-gray-400 font-bold hover:text-gray-300 hover:scale-105 transition-all duration-200"
            >
              Forgot Password
            </Link>

            {/* Login and Signup buttons  */}
            <div className="flex flex-col items-center">
              <button
                disabled={!isValid}
                type="submit"
                className={`rounded-full px-6 py-2 w-40 font-semibold shadow-md mt-4 
                                    ${
                                      isValid
                                        ? "bg-gray-300 text-gray-900 cursor-pointer"
                                        : "bg-gray-500 text-gray-700 cursor-not-allowed"
                                    }`}
              >
                Login
              </button>
              <p className="text-gray-400 font-bold mt-4">
                Don&apos;t have an account?
                <Link
                  to="/sign-up"
                  className="font-bold text-gray-300 ml-1 cursor-pointer hover:scale-110 transition-all duration-200 inline-block"
                >
                  SignUp here!
                </Link>
              </p>

              <div className="w-full">
                <button
                  type="button"
                  className="flex items-center justify-center bg-gray-300 text-gray-900 rounded-full px-6 py-3 w-full font-semibold shadow-md mt-6 space-x-3 cursor-pointer"
                >
                  <img src={google} alt="Google Logo" className="w-5 h-5" />
                  <span>Sign in with Google</span>
                </button>
              </div>
            </div>
          </div>
        </form>
        {import.meta.env.DEV && <DevTool control={control} />}
      </div>
    </div>
  );
};

export default Login;
