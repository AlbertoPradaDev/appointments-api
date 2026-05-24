import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { verificarToken } from "../../../lib/admin-auth";
import bcrypt from "bcryptjs";

export async function PATCH(req: NextRequest) {
  const decoded = verificarToken(req);
  if (!decoded) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { passwordActual, passwordNueva } = await req.json();

  if (!passwordActual || !passwordNueva) {
    return NextResponse.json({ error: "Ambas as senhas são obrigatórias" }, { status: 400 });
  }

  if (passwordNueva.length < 8) {
    return NextResponse.json({ error: "A senha deve ter pelo menos 8 caracteres" }, { status: 400 });
  }

  const negocio = await prisma.negocio.findUnique({
    where: { id: decoded.negocioId },
  });

  if (!negocio?.adminPassword) {
    return NextResponse.json({ error: "Negócio não encontrado" }, { status: 404 });
  }

  const passwordCorrecta = await bcrypt.compare(passwordActual, negocio.adminPassword);

  if (!passwordCorrecta) {
    return NextResponse.json({ error: "Senha atual incorreta" }, { status: 401 });
  }

  const hash = await bcrypt.hash(passwordNueva, 10);

  await prisma.negocio.update({
    where: { id: decoded.negocioId },
    data: { adminPassword: hash },
  });

  return NextResponse.json({ mensaje: "Senha atualizada com sucesso" });
}