import { ReactHookFormConnectorLab } from "./ReactHookFormConnectorLab";
import { ConnectorDemoPage } from "../ConnectorDemoPage";

const connectorCode = `const binding = useReactHookFormConnector<ProfileForm>(document, {
  errorName: ({ pointer }) => pointer === "/profile/name"
    ? "profile.name"
    : "root.canonical",
});

return <form onSubmit={binding.submit}>…</form>;`;

export function ReactHookFormConnectorDemoRoute() {
  return (
    <ConnectorDemoPage
      connectionCode={{ language: "tsx", source: connectorCode }}
      connectionDescription="Invalid submits keep the draft visible and map canonical JSON Pointer diagnostics to host fields. Undo, redo, and external canonical changes reset the form to the source of truth."
      description="React Hook Form owns field lifecycle; json-document owns canonical commits, validation, and history."
      illustration="braces"
      install="npm i @interactive-os/json-document-react-hook-form react-hook-form"
      title="React Hook Form Connector"
    >
      <ReactHookFormConnectorLab />
    </ConnectorDemoPage>
  );
}
