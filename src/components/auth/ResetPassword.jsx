import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { useSearchParams, Link } from "react-router-dom";
import { yupResolver } from "@hookform/resolvers/yup";
import { resetPassword as resetPasswordApi } from "../uitility/authApi";
import EmailSentImage from "../../assets/EmailSent.jpg";
import { resetPasswordValidationSchema } from "../schema/validationSchema";


const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const form = useForm({
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
    mode: "onTouched",
    resolver: yupResolver(resetPasswordValidationSchema),
  });

  const { register, handleSubmit, formState } = form;
  const { errors } = formState;

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverMessage, setServerMessage] = useState(null);
  const [serverError, setServerError] = useState(null);

  const onSubmit = async (data) => {
    if (!token) {
      setServerError("Reset token is missing.");
      return;
    }

    setLoading(true);
    setServerMessage(null);
    setServerError(null);

    try {
      const res = await resetPasswordApi({
        token,
        newPassword: data.newPassword,
      });

      setServerMessage(
        res.data?.message || "Password reset successful. Please log in."
      );
      setSubmitted(true);
    } catch (err) {
      setServerError(
        err?.response?.data?.message || "Unable to reset password. Try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen">
      {/* Left Branding Section */}
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
        <div className="font-bold text-black">Reset Your Password</div>
        <div className="font-bold text-black">Choose a new one</div>
      </div>

      {/* Right Form Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-2 bg-gray-900">
        {submitted ? (
          <div className="text-center">
            <img
              src={EmailSentImage}
              alt="Password Reset"
              className="w-48 mx-auto"
            />
            <h2 className="text-white font-bold mt-4">Password Reset</h2>
            <p className="text-gray-400 font-bold mt-4">{serverMessage}</p>
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
                <h2 className="font-bold text-gray-300">RESET PASSWORD</h2>

                {/* New Password Field */}
                <div className="flex flex-col relative w-full">
                  <label
                    htmlFor="newPassword"
                    className="font-bold absolute text-gray-300 left-2 -top-6"
                  >
                    New Password:
                  </label>
                  <input
                    type="password"
                    id="newPassword"
                    placeholder="Enter new password"
                    {...register("newPassword")}
                    className="bg-gray-300 text-gray-900 rounded-lg placeholder-gray-900 text-center py-2 w-full"
                  />
                  <p className="text-red-500 text-sm mt-1 absolute left-1/2 -translate-x-1/2 -bottom-5 text-center w-full min-h-[20px] whitespace-nowrap overflow-hidden text-ellipsis">
                    {errors.newPassword?.message}
                  </p>
                </div>

                {/* Confirm Password Field */}
                <div className="flex flex-col relative w-full">
                  <label
                    htmlFor="confirmPassword"
                    className="font-bold absolute text-gray-300 left-2 -top-6"
                  >
                    Confirm Password:
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    placeholder="Confirm new password"
                    {...register("confirmPassword")}
                    className="bg-gray-300 text-gray-900 rounded-lg placeholder-gray-900 text-center py-2 w-full"
                  />
                  <p className="text-red-500 text-sm mt-1 absolute left-1/2 -translate-x-1/2 -bottom-5 text-center w-full min-h-[20px] whitespace-nowrap overflow-hidden text-ellipsis">
                    {errors.confirmPassword?.message}
                  </p>
                </div>
              </div>

              {/* Submit Button & Link */}
              <div className="flex flex-col items-center">
                <p className="text-gray-400 font-bold mt-4">
                  Remembered Password?
                  <Link
                    to="/log-in"
                    className="font-bold text-gray-300 ml-1 cursor-pointer hover:scale-110 transition-all duration-200 inline-block"
                  >
                    Login!
                  </Link>
                </p>
                <button
                  type="submit"
                  disabled={loading}
                  className={`flex items-center justify-center bg-gray-300 text-gray-900 rounded-full px-6 py-3 w-full font-semibold shadow-md mt-6 space-x-3 cursor-pointer ${
                    loading ? "opacity-60 pointer-events-none" : ""
                  }`}
                >
                  <span>{loading ? "Resetting..." : "Reset Password"}</span>
                </button>
              </div>

              {serverError && (
                <p className="text-red-400 text-center mt-4">{serverError}</p>
              )}
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
