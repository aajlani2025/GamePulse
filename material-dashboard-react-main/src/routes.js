/**
=========================================================
* Material Dashboard 2 React - v2.2.0
=========================================================

* Product Page: https://www.creative-tim.com/product/material-dashboard-react
* Copyright 2023 Creative Tim (https://www.creative-tim.com)

Coded by www.creative-tim.com

 =========================================================

* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
*/

import Notifications from "layouts/notifications";
import Profile from "layouts/profile";
import SignIn from "layouts/authentication/sign-in";
import SignUp from "layouts/authentication/sign-up";
import NcaaDashboard from "layouts/ncaa-dashboard";
import SignOut from "layouts/authentication/logout";
import Approval from "layouts/approval";
import Cover from "layouts/authentication/reset-password/cover";
import RequireAuth from "components/RequireAuth";

// @mui icons
import Icon from "@mui/material/Icon";

const routes = [
  {
    type: "collapse",
    name: "NCAA Dashboard",
    key: "ncaa-dashboard",
    icon: <Icon fontSize="small">sports_football</Icon>,
    route: "/ncaa-dashboard",
    component: (
      <RequireAuth>
        <NcaaDashboard />
      </RequireAuth>
    ),
  },

  {
    type: "collapse",
    name: "Notifications",
    key: "notifications",
    icon: <Icon fontSize="small">notifications</Icon>,
    route: "/notifications",
    component: (
      <RequireAuth>
        <Notifications />
      </RequireAuth>
    ),
  },
  //{
  //  type: "collapse",
  // name: "Profile",
  //key: "profile",
  //icon: <Icon fontSize="small">person</Icon>,
  //route: "/profile",
  //component: (
  //  <RequireAuth>
  //    <Profile />
  //  </RequireAuth>
  // ),
  // },
  {
    type: "collapse",
    name: "Sign In",
    key: "sign-in",
    icon: <Icon fontSize="small">login</Icon>,
    route: "/authentication/sign-in",
    component: <SignIn />,
  },
  //{
  //  type: "collapse",
  //  name: "Sign Up",
  //  key: "sign-up",
  //  icon: <Icon fontSize="small">assignment</Icon>,
  //  route: "/authentication/sign-up",
  //  component: <SignUp />,
  //},
  //This feature will later be added
  //{
  //type: "collapse",
  //name: "Reset password",
  //key: "reset-password",
  //icon: <Icon fontSize="small">vpn_key</Icon>,
  //route: "/authentication/reset-password",
  //component: (
  // <RequireAuth>
  //   <Cover />
  // </RequireAuth>
  //),
  //},
  {
    type: "collapse",
    name: "Logout",
    key: "logout",
    icon: <Icon fontSize="small">logout</Icon>,
    route: "/authentication/logout",
    component: (
      <RequireAuth>
        <SignOut />
      </RequireAuth>
    ),
  },
  {
    type: "collapse",
    name: "approval",
    key: "approval",
    route: "/approval",
    component: (
      <RequireAuth>
        <Approval />
      </RequireAuth>
    ),
  },
];

export default routes;
