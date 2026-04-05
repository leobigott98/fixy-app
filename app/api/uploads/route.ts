import { NextResponse } from "next/server";

import { getAppSession } from "@/lib/auth/session";
import { getCurrentWorkshop } from "@/lib/data/workshops";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  fixyAssetsBucket,
  getUploadConfig,
  isUploadScope,
  sanitizeUploadPathSegment,
} from "@/lib/uploads";

export async function POST(request: Request) {
  const session = await getAppSession();

  if (!session) {
    return NextResponse.json({ message: "Sesion no disponible." }, { status: 401 });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { message: "Falta SUPABASE_SERVICE_ROLE_KEY para subir archivos." },
      { status: 500 },
    );
  }

  const formData = await request.formData();
  const scopeValue = formData.get("scope");

  if (typeof scopeValue !== "string" || !isUploadScope(scopeValue)) {
    return NextResponse.json({ message: "Tipo de archivo no soportado." }, { status: 400 });
  }

  const files = formData
    .getAll("files")
    .filter((file): file is File => file instanceof File && file.size > 0);

  const config = getUploadConfig(scopeValue);
  const allowedMimeTypes: string[] = [...config.mimeTypes];

  if (!files.length) {
    return NextResponse.json({ message: "Selecciona al menos un archivo." }, { status: 400 });
  }

  if (files.length > config.maxFiles) {
    return NextResponse.json(
      { message: `Solo puedes subir ${config.maxFiles} archivo(s) en esta accion.` },
      { status: 400 },
    );
  }

  const workshop = await getCurrentWorkshop();
  const workspaceKey = workshop?.id ?? sanitizeUploadPathSegment(session.user.loginIdentifier);
  const supabase = createSupabaseAdminClient();

  const uploadedFiles = [];

  for (const file of files) {
    if (!allowedMimeTypes.includes(file.type)) {
      return NextResponse.json(
        { message: `El archivo ${file.name} no tiene un formato permitido.` },
        { status: 400 },
      );
    }

    if (file.size > config.maxSizeInBytes) {
      return NextResponse.json(
        { message: `El archivo ${file.name} supera el tamano permitido.` },
        { status: 400 },
      );
    }

    const fileExtension = file.name.split(".").pop()?.toLowerCase() ?? "bin";
    const filePath = `${config.folder}/${workspaceKey}/${Date.now()}-${crypto.randomUUID()}.${fileExtension}`;
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const { error } = await supabase.storage.from(fixyAssetsBucket).upload(filePath, fileBuffer, {
      contentType: file.type,
      upsert: false,
    });

    if (error) {
      return NextResponse.json(
        { message: `No se pudo subir ${file.name}.` },
        { status: 500 },
      );
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(fixyAssetsBucket).getPublicUrl(filePath);

    uploadedFiles.push({
      url: publicUrl,
      name: file.name,
      contentType: file.type,
    });
  }

  return NextResponse.json({ files: uploadedFiles });
}
