import { Template, waitForURL } from "e2b";

export const template = Template()
  .fromNodeImage("22-slim")
  .setWorkdir("/home/user/project")
  .copy("react_template", "/home/user/project")
  .runCmd("npm install")
  .setStartCmd("npm run dev", waitForURL("http://localhost:5173"));
