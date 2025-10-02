import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { forgotPasswordValidationSchema } from "../schema/validationSchema";
import { useState } from "react";
import EmailSentImage from "../../assets/EmailSent.jpg";

const ForgotPassword = () => {
  const form = useForm({
    defaultValues: {
      email: "",
    },
    mode: "onTouched",
    resolver: yupResolver(forgotPasswordValidationSchema),
  });
  const { register, handleSubmit, formState } = form;
  const { errors } = formState;
  const { email } = useSelector((state) => state.auth);
  const [submitted, setSubmitted] = useState(false);

  const onSubmit = (data) => {
    console.log(data);
    console.log("submitting");
    setSubmitted(true);
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
        {submitted ? (
          <div className="text-center">
            <img
              src={EmailSentImage}
              alt="Email Sent"
              className="w-48 mx-auto"
            />
            <h2 className="text-white font-bold mt-4">Check Your Email!</h2>
            <p className="text-gray-400 font-bold mt-4">
              We have sent you temporary credentials. Please check your inbox.{" "}
            </p>
            <p className="text-gray-400 font-bold mt-4">
              Back to
              <Link
                to="/log-in"
                className="font-bold text-gray-300 ml-1 cursor-pointer hover:scale-110 transition-all duration-200 inline-block"
              >
                Login!
              </Link>
            </p>
          </div>
        ) : (
          <div>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="w-full flex flex-col space-y-4 gap-4">
              <h2 className="font-bold text-gray-300">FORGOT PASSWORD</h2>

              {/* Email Field */}
              <div className="flex flex-col relative w-full">
                <label
                  htmlFor="email"
                  className="font-bold absolute text-gray-300 left-2 -top-6"
                >
                  Email:
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
            </div>

            {/* Reset Password Button */}
            <div className="flex flex-col items-center">
              <p className="text-gray-400 font-bold mt-4">
                Remembered Password?
                <Link
                  to="/log-in"
                  className="font-bold text-gray-300 ml-1 cursor-pointer hover:scale-110 transition-all duration-200 inline-block"
                >
                  Goto Login!
                </Link>
              </p>
              <button
                type="submit"
                className="flex items-center justify-center bg-gray-300 text-gray-900 rounded-full px-6 py-3 w-full font-semibold shadow-md mt-6 space-x-3 cursor-pointer"
              >
                <span>Reset Password</span>
              </button>
            </div>
          </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
