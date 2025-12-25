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
// Footer.jsx
import PropTypes from "prop-types";
import Link from "@mui/material/Link";
// removed Icon import (not used)
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import typography from "assets/theme/base/typography";

function Footer({ company, links }) {
  const { href, name } = company;
  const { size } = typography;
  const year = new Date().getFullYear();

  const renderLinks = () =>
    links.map((link) => (
      <MDBox key={link.name} component="li" px={2} lineHeight={1}>
        <Link href={link.href} target="_blank" rel="noopener noreferrer">
          <MDTypography variant="button" fontWeight="regular" color="text">
            {link.name}
          </MDTypography>
        </Link>
      </MDBox>
    ));

  return (
    <MDBox
      width="100%"
      display="flex"
      flexDirection={{ xs: "column", lg: "row" }}
      justifyContent="space-between"
      alignItems="center"
      px={1.5}
    >
      {/* Left: © YEAR Company */}
      <MDBox mb={{ xs: 2, lg: 0 }}>
        <MDTypography variant="button" color="text" fontSize={size.sm}>
          &copy; {year}{" "}
          <Link href={href} target="_blank" rel="noopener noreferrer">
            <MDTypography component="span" variant="button" color="text" fontWeight="medium">
              {name}
            </MDTypography>
          </Link>
          . All rights reserved.
        </MDTypography>
      </MDBox>

      {/* Right: nav links */}
      <MDBox
        component="ul"
        sx={({ breakpoints }) => ({
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "center",
          listStyle: "none",
          mt: 3,
          mb: 0,
          p: 0,
          [breakpoints.up("lg")]: { mt: 0 },
        })}
      >
        {renderLinks()}
      </MDBox>
    </MDBox>
  );
}

Footer.defaultProps = {
  company: { href: "#", name: "GamePulse" },
  links: [
    { href: "#", name: "About Us" },
    { href: "#", name: "Blog" },
    { href: "#", name: "License" },
  ],
};

Footer.propTypes = {
  company: PropTypes.objectOf(PropTypes.string),
  links: PropTypes.arrayOf(PropTypes.object),
};

export default Footer;
