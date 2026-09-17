import {fireEvent,render,screen,waitFor} from "@testing-library/react";
import {afterEach,describe,expect,it,vi} from "vitest";
import {StrictMode} from "react";
import {AuthControls} from "../auth-controls";
const client=vi.hoisted(()=>({getSession:vi.fn(),signOut:vi.fn()}));
vi.mock("@/lib/auth/client",()=>({authClient:client}));
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();client.getSession.mockReset();client.signOut.mockReset();});
describe("optional Google login",()=>{
  it("loads the session through Strict Mode remounting",async()=>{
    vi.stubGlobal("fetch",vi.fn().mockResolvedValue({ok:true,json:async()=>({enabled:true})}));
    client.getSession.mockResolvedValue({data:{user:{id:"u1",name:"Strict User",email:"demo@example.invalid"}}});
    render(<StrictMode><AuthControls/></StrictMode>);
    expect(await screen.findByText("Strict User")).toBeVisible();
  });
  it("reports missing configuration without opening or navigating the workspace",async()=>{
    vi.stubGlobal("fetch",vi.fn().mockResolvedValue({ok:true,json:async()=>({enabled:false})}));
    const open=vi.spyOn(window,"open").mockReturnValue(null);
    render(<AuthControls/>);
    await waitFor(()=>expect(screen.getByRole("button",{name:"Sign in"})).toBeEnabled());
    fireEvent.click(screen.getByRole("button",{name:"Sign in"}));
    expect(await screen.findByText(/unavailable in this demo/i)).toBeVisible();
    expect(open).not.toHaveBeenCalled();
  });
  it("lets the user retry a blocked popup without falling back to full-page navigation",async()=>{
    vi.stubGlobal("fetch",vi.fn().mockResolvedValue({ok:true,json:async()=>({enabled:true})}));
    client.getSession.mockResolvedValue({data:null});
    const open=vi.spyOn(window,"open").mockReturnValue(null);
    render(<AuthControls/>);
    await waitFor(()=>expect(screen.getByRole("button",{name:"Sign in"})).toBeEnabled());
    fireEvent.click(screen.getByRole("button",{name:"Sign in"}));
    expect(await screen.findByText(/allow popups/i)).toBeVisible();
    expect(open).toHaveBeenCalledWith("/auth/start","imagefinisher-google",expect.any(String));
    expect(screen.getByRole("button",{name:"Sign in"})).toBeEnabled();
  });
  it("shows server-verified user state and clears it after successful sign-out",async()=>{
    vi.stubGlobal("fetch",vi.fn().mockResolvedValue({ok:true,json:async()=>({enabled:true})}));
    client.getSession.mockResolvedValue({data:{user:{id:"u1",name:"Demo User",email:"demo@example.invalid"}}});
    client.signOut.mockResolvedValue({data:{success:true}});
    render(<AuthControls/>);expect(await screen.findByText("Demo User")).toBeVisible();
    client.getSession.mockResolvedValue({data:null});
    fireEvent.click(screen.getByRole("button",{name:"Sign out"}));
    expect(await screen.findByRole("button",{name:"Sign in"})).toBeEnabled();
  });
});
