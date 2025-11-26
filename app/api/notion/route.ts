import { NextRequest, NextResponse } from 'next/server'

interface NotionWorkspace {
  pageTitle: string
  pageIcon: string
  blocks: Array<{
    id: string
    type: string
    content: string
  }>
  lastModified: string
}

const notionStore = new Map<string, NotionWorkspace>()

export async function POST(req: NextRequest) {
  try {
    const body: NotionWorkspace = await req.json()

    if (!body.blocks || !Array.isArray(body.blocks)) {
      return NextResponse.json({ error: 'Invalid workspace payload' }, { status: 400 })
    }

    const userId = 'default-user'
    notionStore.set(userId, {
      ...body,
      lastModified: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      message: 'Workspace synced',
      lastModified: notionStore.get(userId)?.lastModified,
      blockCount: body.blocks.length,
    })
  } catch (error: any) {
    console.error('Notion sync error:', error)
    return NextResponse.json({ error: 'Failed to sync workspace', message: error.message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const userId = 'default-user'
    const workspace = notionStore.get(userId)

    if (!workspace) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, workspace })
  } catch (error: any) {
    console.error('Notion retrieval error:', error)
    return NextResponse.json({ error: 'Failed to retrieve workspace', message: error.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = 'default-user'
    notionStore.delete(userId)

    return NextResponse.json({ success: true, message: 'Workspace cleared' })
  } catch (error: any) {
    console.error('Notion deletion error:', error)
    return NextResponse.json({ error: 'Failed to delete workspace', message: error.message }, { status: 500 })
  }
}

