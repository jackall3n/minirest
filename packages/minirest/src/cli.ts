import { program } from "commander";
import { dev } from "./commands/dev";

program.name("minirest").command("dev").action(dev);

program.parse(process.argv);
