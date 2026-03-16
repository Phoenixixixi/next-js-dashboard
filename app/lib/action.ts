'use server'
import { z } from 'zod'
import postgres from 'postgres'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { signIn } from '@/auth'
import { AuthError } from 'next-auth'
import bcrypt from 'bcrypt'

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' })

export async function registrationAccount(
  prevState: string | undefined | undefined,
  formData: FormData
) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const name = formData.get('name') as string
  const confirm_password = formData.get('confirm-password') as string

  if (!email || !password || !confirm_password || !name) {
    return 'Please fill the blank'
  }

  const isEmailAlready = await sql`
    SELECT * FROM users WHERE email = ${email}
  `

  if (isEmailAlready.length > 0) {
    return 'Email already registered'
  }

  if (password !== confirm_password) {
    return 'Password does not match'
  }
  const hashedPassword = await bcrypt.hash(password, 10)

  try {
    await sql`
      INSERT INTO users (name, email, password)
      VALUES (${name}, ${email}, ${hashedPassword})
    `
  } catch (err) {
    console.error(err)
    return 'Cannot register user'
  }
}

export async function authenticate(
  prevState: string | undefined,
  formData: FormData
) {
  try {
    await signIn('credentials', formData)
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return 'Invalid credentials.'
        default:
          return 'Something went wrong.'
      }
    }
    throw error
  }
}

const FormSchema = z.object({
  id: z.string(),
  customerId: z.string({ invalid_type_error: 'please select a customer' }),
  amount: z.coerce.number().gt(0, {
    message: 'please enter amount greater than 0',
  }),
  status: z.enum(['pending', 'paid'], {
    invalid_type_error: 'please select invoice status',
  }),
  date: z.string(),
})

const CreateInvoices = FormSchema.omit({ id: true, date: true })

export type State = {
  errors?: {
    customerId?: string[]
    amount?: string[]
    status?: string[]
  }
  message?: string | null
}

export async function createInvoices(prevState: State, formData: FormData) {
  const validatedFields = CreateInvoices.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  })
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Create Invoice.',
    }
  }
  const { customerId, amount, status } = validatedFields.data
  const amountInCents = amount * 100
  const date = new Date().toISOString().split('T')[0]
  try {
    await sql`INSERT INTO invoices (customer_id, amount, status, date)
    VALUES (${customerId}, ${amount}, ${status}, ${date})
    
    `
  } catch (err) {
    console.error(err)
    return { message: 'Database Error Failed to Insert Customers' }
  }

  revalidatePath('/dashboard/invoices')
  redirect('/dashboard/invoices')
}

const UpdateInvoice = FormSchema.omit({ id: true, date: true })

export async function updateInvoice(id: string, formData: FormData) {
  const { customerId, amount, status } = UpdateInvoice.parse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  })

  const amountInCents = amount * 100
  try {
    await sql`
    UPDATE invoices
    SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
    WHERE id = ${id}
    `
  } catch (err) {
    console.error(err)
    return { message: 'Database Error Failed to Update Customers' }
  }
  revalidatePath('/dashboard/invoices')
  redirect('/dashboard/invoices')
}

export async function deleteById(id: string) {
  throw new Error('Failed to Delete Invoice')

  try {
    await sql`delete from invoices where id = ${id}`
  } catch (err) {
    console.error(err)
    return { message: 'Database Error Failed to delete Customers' }
  }
  revalidatePath('/dashboard/invoices')
}
