import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth';
import { changeParishPassword, verifyParishPassword } from '@/lib/parish-auth';

export async function POST(request: NextRequest) {
  try {
    // Verificar que el usuario esté autenticado como admin
    const authResult = await verifyAdminAuth(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    // Validar que se proporcionen ambas contraseñas
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Se requieren la contraseña actual y la nueva contraseña' },
        { status: 400 }
      );
    }

    // Validar longitud de la nueva contraseña
    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'La nueva contraseña debe tener al menos 6 caracteres' },
        { status: 400 }
      );
    }

    // Verificar la contraseña actual del párroco
    const isCurrentPasswordValid = await verifyParishPassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        { error: 'La contraseña actual es incorrecta' },
        { status: 400 }
      );
    }

    // Cambiar la contraseña
    const success = await changeParishPassword(newPassword);
    if (!success) {
      return NextResponse.json(
        { error: 'Error al cambiar la contraseña' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Contraseña cambiada exitosamente' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error en change-password:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}