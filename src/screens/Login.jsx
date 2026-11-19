// Brand photography, shared sign-in controls, and demo authentication context.
import photo1 from "../assets/TheGoodGuysPhoto1.png";
import photo2 from "../assets/TheGoodGuysPhoto2.png";
import photo3 from "../assets/TheGoodGuysPhoto3.png";
import photo4 from "../assets/TheGoodGuysPhoto4.png";
import { Tip, Google } from "../components/ui";
import logo from "../assets/TheGoodGuysLogo.png";
import { useAuth } from "../screens/AuthContext";

export default function Login({ onLogin }) {
  // Demo buttons use local role selection; Google sign-in delegates to the parent.
  const { loginAsDemo } = useAuth();

  return (
    <div className="login">
      {/* Four-image collage fills the left side of the login layout. */}
      <div className="photos">
        <img src={photo1} alt="" />
        <img src={photo2} alt="" />
        <img src={photo3} alt="" />
        <img src={photo4} alt="" />
      </div>
      {/* Brand identity, Google sign-in, and local demo shortcuts. */}
      <div className="lpanel">
        <div className="brand">
          <img src={logo} alt="The Good Guys Logo" />
        </div>
        <div className="lcard">
          <h2>Sign in to your account</h2>
          <Tip className="gbtn" tip="Sign in with your Google account" onClick={onLogin}>
            <Google />Continue with Google
          </Tip>

          {/* Quick access offers both available demo roles without authentication. */}
          <div className="demo-box">
            <p>Interviewer quick access (no login required)</p>
            <div className="demo-btns">
              <button type="button" className="btn pri" onClick={() => loginAsDemo("admin")}>
                Demo Admin
              </button>
              <button type="button" className="btn" onClick={() => loginAsDemo("user")}>
                Demo User
              </button>
            </div>
          </div>

          <small>By continuing, you agree to The Good Guys' terms of service</small>
        </div>
      </div>
    </div>
  );
}