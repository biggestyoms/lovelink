import { NextApiRequest } from "next";
import { getIO, NextApiResponseWithSocket } from "@/lib/socket";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default function handler(
  req: NextApiRequest,
  res: NextApiResponseWithSocket
) {
  getIO(res);
  res.end();
}
