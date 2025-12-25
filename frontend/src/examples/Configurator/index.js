/**
=========================================================
* Material Dashboard 2 React - v2.2.0
=========================================================
*/

import Divider from "@mui/material/Divider";
import Switch from "@mui/material/Switch";
import Icon from "@mui/material/Icon";

import Brightness7Icon from "@mui/icons-material/Brightness7"; // sun
import Brightness4Icon from "@mui/icons-material/Brightness4"; // moon

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import ConfiguratorRoot from "examples/Configurator/ConfiguratorRoot";

import { useMaterialUIController, setOpenConfigurator, setDarkMode } from "context";

function Configurator() {
  const [controller, dispatch] = useMaterialUIController();
  const { openConfigurator, darkMode } = controller;

  const handleCloseConfigurator = () => setOpenConfigurator(dispatch, false);
  const handleDarkMode = () => setDarkMode(dispatch, !darkMode);

  return (
    <ConfiguratorRoot variant="permanent" ownerState={{ openConfigurator }}>
      {/* Header */}
      <MDBox
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        pt={4}
        pb={0.5}
        px={3}
        mb={2} // ⟵ extra space under the title
      >
        <MDTypography variant="h5">Choose mode</MDTypography>

        <Icon
          sx={({ typography: { size }, palette: { dark, white } }) => ({
            fontSize: `${size.lg} !important`,
            color: darkMode ? white.main : dark.main,
            stroke: "currentColor",
            strokeWidth: "2px",
            cursor: "pointer",
            transform: "translateY(5px)",
          })}
          onClick={handleCloseConfigurator}
        >
          close
        </Icon>
      </MDBox>

      <Divider />

      {/* Light / Dark toggle row */}
      <MDBox
        px={3}
        py={3} // ⟵ vertical spacing between title and toggle
        display="flex"
        justifyContent="space-between"
        alignItems="center"
      >
        <MDBox display="flex" alignItems="center" gap={1}>
          {darkMode ? <Brightness4Icon /> : <Brightness7Icon />}
          <MDTypography variant="h6">Light / Dark</MDTypography>
        </MDBox>

        <Switch checked={darkMode} onChange={handleDarkMode} />
      </MDBox>

      <Divider />
    </ConfiguratorRoot>
  );
}

export default Configurator;
