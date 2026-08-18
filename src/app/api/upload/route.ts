/*import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";

import { r2 } from "@/lib/r2";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();

    const buffer = Buffer.from(bytes);

    const extension =
      file.name.split(".").pop() || "jpg";

    const fileName =
      `${randomUUID()}.${extension}`;

    await r2.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: `posts/${fileName}`,
        Body: buffer,
        ContentType: file.type,
      })
    );

    const url =
      `${process.env.R2_PUBLIC_URL}/posts/${fileName}`;

    return NextResponse.json({
      success: true,
      url,
    });

  } catch (err) {

    console.error(err);

    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}*/
//ab bas frontend vale code me hi change karna hai